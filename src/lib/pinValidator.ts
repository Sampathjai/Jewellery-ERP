// ERP PIN Validation & Complexity Rules
export const TRIVIAL_PINS = new Set([
  '123456', '654321', '000000', '111111', '222222', '333333',
  '444444', '555555', '666666', '777777', '888888', '999999',
  '123123', '012345', '543210'
]);

export const validatePinComplexity = (pin: string): { valid: boolean; message?: string } => {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return { valid: false, message: 'ERP PIN must be exactly 6 digits (numbers only).' };
  }
  if (TRIVIAL_PINS.has(pin)) {
    return { valid: false, message: 'This PIN is too simple. Please choose a less predictable PIN.' };
  }
  return { valid: true };
};
