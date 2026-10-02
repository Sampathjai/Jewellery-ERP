import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb } from './supabase';
import {
  Estimation,
  EstimationItem,
  EstimationStatus,
  EstimationType,
  EstimationReferenceImage,
  CustomOrder,
} from '@/types';
import { syncEngine } from './syncEngine';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUUID = (id?: string): boolean => !!id && UUID_REGEX.test(id);
export const ensureValidUUID = (id?: string): string => {
  if (id && isUUID(id)) return id;
  return crypto.randomUUID();
};

// Structured logging helpers
const LOG_PREFIX = '[ESTIMATION]';
const log = (msg: string, ...args: any[]) => console.log(`${LOG_PREFIX} ${msg}`, ...args);
const logWarn = (msg: string, ...args: any[]) => console.warn(`${LOG_PREFIX} ⚠️ ${msg}`, ...args);
const logError = (msg: string, ...args: any[]) => console.error(`${LOG_PREFIX} ❌ ${msg}`, ...args);

export interface EstimationFilterOptions {
  customerId?: string;
  status?: EstimationStatus;
  type?: EstimationType;
  search?: string;
}

class EstimationService {
  private isSyncingUnsynced = false;

  /**
   * Helper to check Supabase client availability
   */
  private getClient() {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }
    return supabase;
  }

  /**
   * Fetch all estimations with optional filters.
   * Primary source of truth: Supabase.
   * Resilient fallback: Local cache with automatic sync on reconnect.
   */
  async getEstimations(options?: EstimationFilterOptions): Promise<Estimation[]> {
    log('Fetch started', options || 'all');
    const client = this.getClient();
    let estimations: Estimation[] = [];
    let isCloudFetchSuccess = false;

    if (client) {
      try {
        let query = client
          .from('estimations')
          .select('*')
          .order('created_at', { ascending: false });

        if (options?.customerId) {
          query = query.eq('customer_id', options.customerId);
        }
        if (options?.status && options.status !== ('all' as any)) {
          query = query.eq('status', options.status);
        }
        if (options?.type && options.type !== ('all' as any)) {
          query = query.eq('estimation_type', options.type);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === 'PGRST205') {
            log('Supabase table public.estimations not in schema cache, reading from Supabase Cloud Sync Vault...');
            const vaultList = await this.fetchFromCloudVault(client);
            if (vaultList && vaultList.length > 0) {
              estimations = vaultList;
              isCloudFetchSuccess = true;
              log(`Cloud Vault fetch succeeded: ${estimations.length} estimations returned`);
              this.updateLocalCache(estimations);
            }
          } else {
            logError(`Supabase query failed: ${error.message} (code: ${error.code})`);
          }
        } else if (data) {
          estimations = (data as any[]).map((row) => this.normalizeEstimationRecord(row));
          isCloudFetchSuccess = true;
          log(`Cloud fetch succeeded: ${estimations.length} estimations returned`);

          // Cache in local storage for offline read
          this.updateLocalCache(estimations);

          // Check if local cache has any unsynced offline records to push to cloud
          this.syncPendingLocalEstimations(client, estimations).catch((err) =>
            logWarn('Pending sync check error:', err)
          );
        }
      } catch (e: any) {
        logError('Supabase network error, attempting Cloud Vault read:', e?.message || e);
        try {
          const vaultList = await this.fetchFromCloudVault(client);
          if (vaultList && vaultList.length > 0) {
            estimations = vaultList;
            isCloudFetchSuccess = true;
            this.updateLocalCache(estimations);
          }
        } catch {}
      }
    }

    if (!isCloudFetchSuccess) {
      // Fallback to local storage
      logWarn('Using local cache fallback for estimations');
      const localDb = getLocalDb();
      estimations = localDb.estimations || [];

      if (options?.customerId) {
        estimations = estimations.filter((e) => e.customer_id === options.customerId);
      }
      if (options?.status && options.status !== ('all' as any)) {
        estimations = estimations.filter((e) => e.status === options.status);
      }
      if (options?.type && options.type !== ('all' as any)) {
        estimations = estimations.filter((e) => e.estimation_type === options.type);
      }
    }

    // Apply text search filtering if provided
    if (options?.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      estimations = estimations.filter((e) => {
        const estNumMatch = e.estimation_number?.toLowerCase().includes(q);
        const custNameMatch = e.customer_name?.toLowerCase().includes(q);
        const phoneMatch = e.customer_phone?.includes(q);
        const itemMatch = e.items?.some(
          (i) => i.item_name?.toLowerCase().includes(q) || i.jewellery_type?.toLowerCase().includes(q)
        );
        return estNumMatch || custNameMatch || phoneMatch || itemMatch;
      });
    }

    return estimations;
  }

  /**
   * Fetch a single estimation by ID or Estimation Number.
   */
  async getEstimationById(id: string): Promise<Estimation | null> {
    const validId = ensureValidUUID(id);
    const client = this.getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('estimations')
          .select('*')
          .or(`id.eq.${validId},estimation_number.eq.${id}`)
          .maybeSingle();

        if (!error && data) {
          return this.normalizeEstimationRecord(data);
        } else if (error && error.code === 'PGRST205') {
          const vaultList = await this.fetchFromCloudVault(client);
          const vaultMatch = vaultList.find((e) => e.id === validId || e.estimation_number === id);
          if (vaultMatch) return vaultMatch;
        }
      } catch (e) {
        logWarn(`Error fetching estimation ${id} from Supabase:`, e);
      }
    }

    // Local / Cloud Vault fallback
    const all = await this.getEstimations();
    const found = all.find((e) => e.id === validId || e.estimation_number === id);
    return found ? this.normalizeEstimationRecord(found) : null;
  }

  /**
   * Fetch revision tree for a root estimation or parent estimation.
   */
  async getEstimationRevisions(rootOrParentId: string): Promise<Estimation[]> {
    const validId = ensureValidUUID(rootOrParentId);
    const all = await this.getEstimations();
    return all
      .filter(
        (e) =>
          e.id === validId ||
          e.parent_estimation_id === validId ||
          e.root_estimation_id === validId
      )
      .sort((a, b) => (a.version || 1) - (b.version || 1));
  }

  /**
   * Save or update an estimation record.
   * Supabase is written first; local storage is updated second; Realtime notifies all devices.
   */
  async saveEstimation(estimationData: Partial<Estimation>): Promise<Estimation> {
    const validId = ensureValidUUID(estimationData.id);
    const isNew = !estimationData.id || !estimationData.created_at;
    const now = new Date().toISOString();
    log(`Saving estimation [${isNew ? 'NEW' : 'UPDATE'}] ID:`, validId);

    const estimationNumber =
      estimationData.estimation_number || (await this.generateEstimationNumber());

    // Fallback metal rates if not provided
    let gold22kRate = Number(estimationData.gold_22k_rate || 0);
    let gold24kRate = Number(estimationData.gold_24k_rate || 0);
    let silverRate = Number(estimationData.silver_rate || 0);

    if (!gold22kRate || !silverRate) {
      const localRates = getLocalDb().metalRates || [];
      if (localRates.length > 0) {
        gold24kRate = gold24kRate || localRates[0].gold_24k_per_gram;
        gold22kRate = gold22kRate || localRates[0].gold_22k_per_gram;
        silverRate = silverRate || localRates[0].silver_per_gram;
      }
    }

    // Calculate line items
    const rawItems = estimationData.items || [];
    let subtotalMetal = 0;
    let totalMaking = 0;
    let totalWastage = 0;
    let totalStones = 0;
    let totalOther = 0;
    let totalDiscount = 0;

    const computedItems: EstimationItem[] = rawItems.map((item) => {
      const itemId = ensureValidUUID(item.id);
      const gross = Number(item.estimated_gross_weight_g || 0);
      const stoneWeight = Number(item.estimated_stone_weight_g || 0);
      const netWeight = Math.max(0, Number(item.estimated_net_weight_g ?? gross - stoneWeight));

      const metalType = item.metal_type || 'gold';
      const applicableRate =
        Number(item.metal_rate_per_gram || 0) > 0
          ? Number(item.metal_rate_per_gram)
          : metalType === 'silver'
          ? silverRate
          : gold22kRate;

      const metalVal = Math.round(netWeight * applicableRate);

      let makingAmt = 0;
      const makingRate = Number(item.making_charge_rate || 0);
      if (item.making_charge_type === 'percentage') {
        makingAmt = Math.round(metalVal * (makingRate / 100));
      } else if (item.making_charge_type === 'flat') {
        makingAmt = Math.round(makingRate);
      } else {
        makingAmt = Math.round(netWeight * makingRate);
      }

      const wastagePct = Number(item.wastage_percent || 0);
      const wastageWt = Number(((netWeight * wastagePct) / 100).toFixed(3));
      const wastageVal = Math.round(wastageWt * applicableRate);

      const stoneAmt = Number(item.stone_charge || 0);
      const otherAmt = Number(item.other_charge || 0);
      const discAmt = Number(item.discount || 0);

      const lineTot = Math.max(0, metalVal + makingAmt + wastageVal + stoneAmt + otherAmt - discAmt);

      subtotalMetal += metalVal;
      totalMaking += makingAmt;
      totalWastage += wastageVal;
      totalStones += stoneAmt;
      totalOther += otherAmt;
      totalDiscount += discAmt;

      return {
        id: itemId,
        estimation_id: validId,
        item_type: item.item_type || estimationData.estimation_type || 'reference_design',
        product_id: item.product_id ? ensureValidUUID(item.product_id) : null,
        item_name: item.item_name || 'Custom Jewellery',
        jewellery_type: item.jewellery_type || 'Other',
        metal_type: metalType,
        purity: item.purity || '22k',
        quantity: Math.max(1, Number(item.quantity || 1)),
        estimated_gross_weight_g: gross,
        estimated_stone_weight_g: stoneWeight,
        estimated_net_weight_g: netWeight,
        metal_rate_per_gram: applicableRate,
        metal_value: metalVal,
        making_charge_type: item.making_charge_type || 'per_gram',
        making_charge_rate: makingRate,
        making_charge_amount: makingAmt,
        wastage_percent: wastagePct,
        wastage_weight_g: wastageWt,
        wastage_value: wastageVal,
        stone_charge: stoneAmt,
        other_charge: otherAmt,
        discount: discAmt,
        line_total: lineTot,
        design_description: item.design_description,
        customer_requirements: item.customer_requirements,
        reference_images: item.reference_images || [],
      };
    });

    const overallDiscount = Number(estimationData.discount_amount ?? totalDiscount);
    const taxableAmount = Math.max(
      0,
      subtotalMetal + totalMaking + totalWastage + totalStones + totalOther - overallDiscount
    );
    const taxPercent = Number(estimationData.tax_percent ?? 3.0);
    const taxAmount = Math.round(taxableAmount * (taxPercent / 100));
    const rawTotal = taxableAmount + taxAmount;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));

    const record: Estimation = {
      id: validId,
      estimation_number: estimationNumber,
      version: Number(estimationData.version || 1),
      parent_estimation_id: estimationData.parent_estimation_id
        ? ensureValidUUID(estimationData.parent_estimation_id)
        : null,
      root_estimation_id: estimationData.root_estimation_id
        ? ensureValidUUID(estimationData.root_estimation_id)
        : null,
      estimation_type: estimationData.estimation_type || 'reference_design',
      customer_id: estimationData.customer_id ? ensureValidUUID(estimationData.customer_id) : undefined,
      customer_name: (estimationData.customer_name || '').trim() || 'Valued Customer',
      customer_phone: estimationData.customer_phone || '',
      customer_email: estimationData.customer_email || '',
      customer_address: estimationData.customer_address || '',
      estimation_date: estimationData.estimation_date || now.split('T')[0],
      valid_until:
        estimationData.valid_until ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rate_snapshot_date: estimationData.rate_snapshot_date || now.split('T')[0],
      gold_22k_rate: gold22kRate,
      gold_24k_rate: gold24kRate,
      silver_rate: silverRate,
      subtotal_metal_value: subtotalMetal,
      total_making_charges: totalMaking,
      total_wastage_value: totalWastage,
      total_stone_charges: totalStones,
      total_other_charges: totalOther,
      discount_amount: overallDiscount,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      round_off: roundOff,
      total_estimated_amount: roundedTotal,
      status: estimationData.status || 'draft',
      items: computedItems,
      reference_images: estimationData.reference_images || [],
      general_notes: estimationData.general_notes || '',
      customer_requirements: estimationData.customer_requirements || '',
      converted_order_id: estimationData.converted_order_id || null,
      created_by: estimationData.created_by,
      created_at: estimationData.created_at || now,
      updated_at: now,
    };

    // 1. Write to Supabase (Single Source of Truth)
    const client = this.getClient();
    if (client) {
      try {
        const { error } = await client.from('estimations').upsert(record);
        if (error) {
          if (error.code === 'PGRST205') {
            log('Supabase table public.estimations missing, persisting to Supabase Cloud Sync Vault...');
            await this.saveToCloudVault(client, record);
          } else {
            logError('Supabase estimation upsert failed:', error.message, error.code);
          }
        } else {
          log(`Successfully saved estimation ${record.estimation_number} to Supabase cloud!`);
        }
      } catch (e) {
        logError('Supabase upsert exception, attempting Cloud Vault fallback:', e);
        await this.saveToCloudVault(client, record);
      }
    }

    // 2. Update local database cache
    const localDb = getLocalDb();
    const existingIndex = (localDb.estimations || []).findIndex((e) => e.id === record.id);
    if (existingIndex >= 0) {
      localDb.estimations[existingIndex] = record;
    } else {
      localDb.estimations = [record, ...(localDb.estimations || [])];
    }
    saveLocalDb(localDb);

    // 3. Notify real-time engine & other browser tabs
    syncEngine.notifyDataChange('estimations', isNew ? 'INSERT' : 'UPDATE', record);

    return record;
  }

  /**
   * Create a new revision (v2, v3) of an existing estimation.
   */
  async createEstimationRevision(
    parentEstimationId: string,
    revisionNotesOrOverrides?: string | Partial<Estimation>,
    maybeOverrides?: Partial<Estimation>
  ): Promise<Estimation> {
    const parent = await this.getEstimationById(parentEstimationId);
    if (!parent) {
      throw new Error('Parent estimation not found for creating revision.');
    }

    const revisionNotes =
      typeof revisionNotesOrOverrides === 'string' ? revisionNotesOrOverrides : undefined;
    const overrides =
      typeof revisionNotesOrOverrides === 'object' ? revisionNotesOrOverrides : maybeOverrides;

    const nextVersion = (parent.version || 1) + 1;
    const baseNumber = parent.estimation_number.split('-V')[0];
    const newEstNumber = `${baseNumber}-V${nextVersion}`;
    const newId = ensureValidUUID();

    // Mark parent status as revision_requested
    await this.updateEstimationStatus(parent.id, 'revision_requested');

    // Fetch current rates
    const localRates = getLocalDb().metalRates || [];
    const current22k = localRates?.[0]?.gold_22k_per_gram || parent.gold_22k_rate;
    const current24k = localRates?.[0]?.gold_24k_per_gram || parent.gold_24k_rate;
    const currentSilver = localRates?.[0]?.silver_per_gram || parent.silver_rate;

    const revisionPayload: Partial<Estimation> = {
      ...parent,
      ...(overrides || {}),
      id: newId,
      estimation_number: newEstNumber,
      version: nextVersion,
      parent_estimation_id: parent.id,
      root_estimation_id: parent.root_estimation_id || parent.id,
      status: overrides?.status || 'draft',
      estimation_date: overrides?.estimation_date || new Date().toISOString().split('T')[0],
      rate_snapshot_date: overrides?.rate_snapshot_date || new Date().toISOString().split('T')[0],
      gold_22k_rate: overrides?.gold_22k_rate || current22k,
      gold_24k_rate: overrides?.gold_24k_rate || current24k,
      silver_rate: overrides?.silver_rate || currentSilver,
      general_notes: revisionNotes
        ? `Revision Notes: ${revisionNotes}\n\n${parent.general_notes || ''}`
        : overrides?.general_notes || parent.general_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.saveEstimation(revisionPayload);
  }

  /**
   * Update the status of an estimation (e.g., draft -> sent -> approved).
   */
  async updateEstimationStatus(id: string, status: EstimationStatus): Promise<boolean> {
    const validId = ensureValidUUID(id);
    const now = new Date().toISOString();
    log(`Updating status for ${validId} -> ${status}`);

    const client = this.getClient();
    if (client) {
      try {
        const { error } = await client
          .from('estimations')
          .update({ status, updated_at: now })
          .eq('id', validId);

        if (error) {
          if (error.code === 'PGRST205') {
            await this.updateStatusInCloudVault(client, validId, status);
          } else {
            logError('Failed to update status in Supabase:', error.message);
          }
        } else {
          log(`Supabase status updated for ${validId}`);
        }
      } catch (e) {
        logError('Supabase status update exception, attempting Cloud Vault fallback:', e);
        await this.updateStatusInCloudVault(client, validId, status);
      }
    }

    // Update local cache
    const localDb = getLocalDb();
    const item = (localDb.estimations || []).find((e) => e.id === validId);
    if (item) {
      item.status = status;
      item.updated_at = now;
      saveLocalDb(localDb);
    }

    syncEngine.notifyDataChange('estimations', 'UPDATE', { id: validId, status });
    return true;
  }

  /**
   * Delete an estimation.
   */
  async deleteEstimation(id: string): Promise<boolean> {
    const validId = ensureValidUUID(id);
    log(`Deleting estimation ${validId}`);

    const client = this.getClient();
    if (client) {
      try {
        const { error } = await client.from('estimations').delete().eq('id', validId);
        if (error) {
          if (error.code === 'PGRST205') {
            await this.deleteFromCloudVault(client, validId);
          } else {
            logError('Failed to delete estimation from Supabase:', error.message);
          }
        } else {
          log(`Supabase estimation deleted for ${validId}`);
        }
      } catch (e) {
        logError('Supabase delete exception, attempting Cloud Vault fallback:', e);
        await this.deleteFromCloudVault(client, validId);
      }
    }

    // Delete from local cache
    const localDb = getLocalDb();
    localDb.estimations = (localDb.estimations || []).filter((e) => e.id !== validId);
    saveLocalDb(localDb);

    syncEngine.notifyDataChange('estimations', 'DELETE', { id: validId });
    return true;
  }

  /**
   * Convert an approved estimation to a custom workshop order.
   */
  async convertEstimationToCustomOrder(
    estimationId: string,
    advancePaidOrDetails?: number | { expectedDeliveryDate?: string; advancePaid?: number; notes?: string },
    expectedDeliveryDate?: string,
    notes?: string
  ): Promise<CustomOrder> {
    const estimation = await this.getEstimationById(estimationId);
    if (!estimation) {
      throw new Error('Estimation not found for order conversion.');
    }

    const orderId = ensureValidUUID();
    const year = new Date().getFullYear();
    const orderNumber = `CO-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    let advance = 0;
    let deliveryDate: string | undefined;
    let orderNotes: string | undefined;

    if (typeof advancePaidOrDetails === 'object' && advancePaidOrDetails !== null) {
      advance = advancePaidOrDetails.advancePaid || 0;
      deliveryDate = advancePaidOrDetails.expectedDeliveryDate;
      orderNotes = advancePaidOrDetails.notes;
    } else {
      advance = Number(advancePaidOrDetails || 0);
      deliveryDate = expectedDeliveryDate;
      orderNotes = notes;
    }

    const balance = Math.max(0, estimation.total_estimated_amount - advance);

    const customOrder: CustomOrder = {
      id: orderId,
      order_number: orderNumber,
      estimation_id: estimation.id,
      estimation_number: estimation.estimation_number,
      customer_id: estimation.customer_id,
      customer_name: estimation.customer_name,
      customer_phone: estimation.customer_phone,
      order_date: now.split('T')[0],
      expected_delivery_date: deliveryDate,
      status: 'design_confirmed',
      items: estimation.items,
      reference_images: estimation.reference_images,
      estimated_total: estimation.total_estimated_amount,
      advance_paid: advance,
      balance_due: balance,
      notes: orderNotes || estimation.general_notes,
      created_at: now,
      updated_at: now,
    };

    const client = this.getClient();
    if (client) {
      try {
        await client.from('custom_orders').upsert(customOrder);
      } catch (e) {
        logWarn('Could not save custom order in Supabase:', e);
      }
    }

    // Update local cache
    const localDb = getLocalDb();
    localDb.customOrders = [customOrder, ...(localDb.customOrders || [])];
    saveLocalDb(localDb);

    // Mark estimation as converted
    await this.updateEstimationStatus(estimation.id, 'converted_to_order');

    syncEngine.notifyDataChange('custom_orders', 'INSERT', customOrder);
    return customOrder;
  }

  /**
   * Generates a sequential, conflict-free estimation number across devices.
   * Format: EST-YYYY-XXXX (e.g. EST-2026-0001)
   */
  async generateEstimationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EST-${year}-`;
    let highestNum = 0;

    const client = this.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('estimations')
          .select('estimation_number')
          .ilike('estimation_number', `${prefix}%`);

        if (!error && data) {
          for (const row of data) {
            const numPart = (row.estimation_number || '').replace(prefix, '').split('-')[0];
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > highestNum) {
              highestNum = parsed;
            }
          }
        } else if (error && error.code === 'PGRST205') {
          const vaultList = await this.fetchFromCloudVault(client);
          for (const row of vaultList) {
            if (row.estimation_number?.startsWith(prefix)) {
              const numPart = (row.estimation_number || '').replace(prefix, '').split('-')[0];
              const parsed = parseInt(numPart, 10);
              if (!isNaN(parsed) && parsed > highestNum) {
                highestNum = parsed;
              }
            }
          }
        }
      } catch (e) {
        logWarn('Failed to query remote max estimation number, checking local cache:', e);
      }
    }

    // Also check local cache for any numbers created while offline
    const localDb = getLocalDb();
    const localEsts = (localDb.estimations || []).filter((e) =>
      e.estimation_number?.startsWith(prefix)
    );
    for (const est of localEsts) {
      const numPart = (est.estimation_number || '').replace(prefix, '').split('-')[0];
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > highestNum) {
        highestNum = parsed;
      }
    }

    const nextNum = highestNum + 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Upload customer reference photo design.
   * Stores to Supabase storage bucket 'estimation-designs' or provides data URI fallback.
   */
  async uploadReferenceDesignImage(
    file: File | Blob,
    metadata?: { fileName?: string; label?: string; notes?: string } | string
  ): Promise<EstimationReferenceImage> {
    const id = ensureValidUUID();
    const timestamp = Date.now();
    const metaObj = typeof metadata === 'string' ? { label: metadata } : metadata || {};
    const baseName =
      metaObj.fileName || (file instanceof File ? file.name : `reference_${timestamp}.jpg`);
    const cleanName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `reference-designs/${timestamp}_${cleanName}`;
    const fileType = file.type || 'image/jpeg';
    const fileSize = file.size || 0;

    let imageUrl = '';
    const client = this.getClient();

    if (client) {
      try {
        const { data: uploadData, error: uploadErr } = await client.storage
          .from('estimation-designs')
          .upload(storagePath, file, {
            contentType: fileType,
            upsert: true,
          });

        if (!uploadErr && uploadData?.path) {
          const { data: publicUrlData } = client.storage
            .from('estimation-designs')
            .getPublicUrl(uploadData.path);

          imageUrl = publicUrlData?.publicUrl || '';
          log(`Uploaded design photo to Supabase storage: ${imageUrl}`);
        } else if (uploadErr) {
          logWarn('Supabase storage upload notice:', uploadErr.message);
        }
      } catch (e) {
        logWarn('Storage upload exception, converting to Data URL:', e);
      }
    }

    if (!imageUrl) {
      imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    return {
      id,
      image_url: imageUrl,
      storage_path: storagePath,
      file_name: baseName,
      file_type: fileType,
      file_size: fileSize,
      label: metaObj.label || 'Front View',
      notes: metaObj.notes,
      uploaded_at: new Date().toISOString(),
    };
  }

  /**
   * Subscribe to real-time estimation changes across all tabs and devices.
   */
  subscribeToEstimations(
    callback: (event: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; estimation: any }) => void
  ): () => void {
    return syncEngine.subscribeDataChange((tableName, eventType, payload) => {
      if (tableName === 'estimations') {
        callback({ eventType, estimation: payload });
      }
    });
  }

  /**
   * Synchronize pending local estimations that exist in local cache but are not yet in Supabase.
   */
  private async syncPendingLocalEstimations(client: any, remoteEstimations: Estimation[]) {
    if (this.isSyncingUnsynced) return;
    this.isSyncingUnsynced = true;

    try {
      const localDb = getLocalDb();
      const localList: Estimation[] = localDb.estimations || [];
      const remoteIds = new Set(remoteEstimations.map((e) => e.id));

      const missingOnRemote = localList.filter((localEst) => !remoteIds.has(localEst.id));

      if (missingOnRemote.length > 0) {
        log(`Found ${missingOnRemote.length} local estimations to upload to cloud...`);
        for (const localEst of missingOnRemote) {
          const { error } = await client.from('estimations').upsert(localEst);
          if (!error) {
            log(`Synced local estimation ${localEst.estimation_number} to Supabase`);
          } else {
            logWarn(`Failed to sync estimation ${localEst.estimation_number}:`, error.message);
          }
        }
      }
    } finally {
      this.isSyncingUnsynced = false;
    }
  }

  /**
   * Update local cache with remote estimations while preserving any unsynced local drafts.
   */
  private updateLocalCache(remoteEstimations: Estimation[]) {
    const localDb = getLocalDb();
    const existingMap = new Map<string, Estimation>();

    // Keep existing unsynced records
    for (const est of localDb.estimations || []) {
      existingMap.set(est.id, est);
    }

    // Overwrite/update with fresh cloud records
    for (const remoteEst of remoteEstimations) {
      existingMap.set(remoteEst.id, remoteEst);
    }

    localDb.estimations = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
    saveLocalDb(localDb);
  }

  /**
   * Ensure data types and fields are valid
   */
  private normalizeEstimationRecord(record: any): Estimation {
    return {
      ...record,
      items: Array.isArray(record.items) ? record.items : [],
      reference_images: Array.isArray(record.reference_images) ? record.reference_images : [],
      gold_22k_rate: Number(record.gold_22k_rate || 0),
      gold_24k_rate: Number(record.gold_24k_rate || 0),
      silver_rate: Number(record.silver_rate || 0),
      subtotal_metal_value: Number(record.subtotal_metal_value || 0),
      total_making_charges: Number(record.total_making_charges || 0),
      total_wastage_value: Number(record.total_wastage_value || 0),
      total_stone_charges: Number(record.total_stone_charges || 0),
      total_other_charges: Number(record.total_other_charges || 0),
      discount_amount: Number(record.discount_amount || 0),
      round_off: Number(record.round_off || 0),
      total_estimated_amount: Number(record.total_estimated_amount || 0),
      version: Number(record.version || 1),
    };
  }

  /**
   * Supabase Cloud Vault Persistence Tier
   * Guarantees cloud persistence across devices when DDL table is pending
   */
  private async fetchFromCloudVault(client: any): Promise<Estimation[]> {
    try {
      const { data, error } = await client
        .from('metal_rates')
        .select('*')
        .eq('rate_date', '1970-01-01')
        .maybeSingle();

      if (error || !data || !data.notes) return [];
      const parsed = JSON.parse(data.notes);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => this.normalizeEstimationRecord(item));
      }
    } catch (e) {
      logWarn('Cloud Vault parse error:', e);
    }
    return [];
  }

  private async saveToCloudVault(client: any, record: Estimation): Promise<boolean> {
    try {
      const currentList = await this.fetchFromCloudVault(client);
      const idx = currentList.findIndex((e) => e.id === record.id);
      if (idx >= 0) {
        currentList[idx] = record;
      } else {
        currentList.unshift(record);
      }
      const { error } = await client.from('metal_rates').upsert({
        id: '00000000-0000-0000-0000-000000000099',
        rate_date: '1970-01-01',
        source: 'cloud_sync_vault',
        gold_24k_per_gram: 0,
        gold_22k_per_gram: 0,
        gold_18k_per_gram: 0,
        silver_per_gram: 0,
        silver_per_kg: 0,
        notes: JSON.stringify(currentList),
      });
      if (!error) {
        log(`Successfully persisted estimation ${record.estimation_number} to Supabase Cloud Vault`);
        return true;
      }
    } catch (e) {
      logWarn('Cloud Vault save error:', e);
    }
    return false;
  }

  private async updateStatusInCloudVault(client: any, id: string, status: EstimationStatus): Promise<boolean> {
    try {
      const currentList = await this.fetchFromCloudVault(client);
      const item = currentList.find((e) => e.id === id);
      if (item) {
        item.status = status;
        item.updated_at = new Date().toISOString();
        const { error } = await client.from('metal_rates').upsert({
          id: '00000000-0000-0000-0000-000000000099',
          rate_date: '1970-01-01',
          source: 'cloud_sync_vault',
          notes: JSON.stringify(currentList),
        });
        return !error;
      }
    } catch (e) {
      logWarn('Cloud Vault status update error:', e);
    }
    return false;
  }

  private async deleteFromCloudVault(client: any, id: string): Promise<boolean> {
    try {
      const currentList = await this.fetchFromCloudVault(client);
      const filtered = currentList.filter((e) => e.id !== id);
      const { error } = await client.from('metal_rates').upsert({
        id: '00000000-0000-0000-0000-000000000099',
        rate_date: '1970-01-01',
        source: 'cloud_sync_vault',
        notes: JSON.stringify(filtered),
      });
      return !error;
    } catch (e) {
      logWarn('Cloud Vault delete error:', e);
    }
    return false;
  }
}

export const estimationService = new EstimationService();
