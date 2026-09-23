export const resolveFormMode = ({ isExistingRecord, dialogMode }) =>
  isExistingRecord ? "edit" : dialogMode;

export const initializeFieldValue = ({
  existingValue,
  hasExistingValue,
  isActiveField,
}) => {
  if (hasExistingValue) {
    return existingValue;
  }

  return isActiveField ? true : undefined;
};
