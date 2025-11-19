# BSDataGrid Locale-Aware Date Formatting

## Overview

BSDataGrid now supports locale-aware date formatting that automatically adjusts date display based on the locale setting.

## Features

### 🌐 **Automatic Locale Detection**

The component determines the effective locale using this priority:

1. `bsLocale` prop (highest priority)
2. `user.locale_id` from userinfo (from AuthContext)
3. Default fallback to "en"

### 📅 **Date Format Support**

#### All Locales - Consistent DD/MM/YYYY Format

- **Date Format**: DD/MM/YYYY (consistent across all locales)
- **DateTime Format**: DD/MM/YYYY HH:mm (no comma separator)

#### English Locale (`bsLocale="en"`)

- **Year Format**: ค.ศ. (Gregorian calendar)
- **Example**: `25/12/2024 14:30`

#### Thai Locale (`bsLocale="th"`)

- **Year Format**: พ.ศ. (Buddhist Era = Gregorian + 543 years)
- **Example**: `25/12/2567 14:30` (2024 + 543 = 2567)

## Usage Examples

### Basic Usage with Explicit Locale

```jsx
// English locale - displays Gregorian years (ค.ศ.)
<BSDataGrid
  bsObj="tbm_orders"
  bsPreObj="ams"
  bsLocale="en"
/>

// Thai locale - displays Buddhist Era years (พ.ศ.)
<BSDataGrid
  bsObj="tbm_orders"
  bsPreObj="ams"
  bsLocale="th"
/>
```

### Auto-Detection from User Info

```jsx
// Uses user.locale_id from AuthContext
<BSDataGrid
  bsObj="tbm_orders"
  bsPreObj="ams"
  // No bsLocale specified - uses user's locale preference
/>
```

### Column-Specific Examples

```jsx
// Show specific date columns with locale formatting
<BSDataGrid
  bsObj="tbm_orders"
  bsPreObj="ams"
  bsCols="order_id,customer_name,order_date,delivery_date"
  bsLocale="th" // Will show dates in Buddhist Era
/>
```

## Supported Data Types

### Date/Time Columns

- `datetime` - Full date and time with locale formatting
- `datetime2` - Enhanced datetime with locale formatting
- `date` - Date only with locale formatting
- `time` - Time only (no locale impact)

### Number Columns

- `int`, `decimal`, `money` - Formatted with locale-specific number formatting
- Uses appropriate thousand separators and decimal points

## Implementation Details

### Locale Resolution Logic

```javascript
const getEffectiveLocale = useCallback(() => {
  // Priority: bsLocale prop > user.locale_id > default 'en'
  if (bsLocale && bsLocale !== "default") {
    return bsLocale;
  }

  if (user?.locale_id || user?.localeId || user?.locale) {
    return user.locale_id || user.localeId || user.locale;
  }

  return "en"; // Default fallback
}, [bsLocale, user]);
```

### Format Options

```javascript
const formatOptions = {
  // Thai locale example
  dateOptions: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    calendar: "buddhist", // Converts to Buddhist Era
  },
  localeString: "th-TH",
};
```

## Debug Information

The component logs locale detection and formatting for debugging:

```javascript
Logger.log("🌐 Format cell value with locale:", {
  value,
  dataType,
  effectiveLocale,
  bsLocale,
  userLocale: user?.locale_id,
});
```

## Error Handling

If locale formatting fails, the component gracefully falls back to string conversion:

```javascript
try {
  return new Date(value).toLocaleDateString(localeString, dateOptions);
} catch (error) {
  Logger.warn("Failed to format with locale, using fallback");
  return String(value);
}
```

## Best Practices

### 1. Explicit Locale Setting

For applications that need consistent locale across all users:

```jsx
<BSDataGrid bsLocale="th" {...otherProps} />
```

### 2. User-Based Locale

For multi-locale applications:

```jsx
// Let user's preference from AuthContext determine locale
<BSDataGrid {...props} />
```

### 3. Form Integration

When editing dates, consider locale consistency:

```jsx
<BSDataGrid
  bsLocale="th"
  onEdit={(row) => {
    // Editing forms should also respect Thai locale
    // Show Buddhist Era dates in forms
  }}
/>
```

## Testing Scenarios

### Test Cases to Verify

1. **English Locale**: Verify Gregorian years display correctly
2. **Thai Locale**: Verify Buddhist Era conversion (year + 543)
3. **User Locale**: Test with different `user.locale_id` values
4. **Fallback**: Test with no locale specified
5. **Error Handling**: Test with invalid date values

### Sample Test Data

```javascript
const testData = [
  {
    id: 1,
    name: "Test Order",
    order_date: "2024-12-25T10:30:00",
    delivery_date: "2024-12-26",
  },
];

// Expected outputs (DD/MM/YYYY format):
// bsLocale="en": 25/12/2024 10:30, 26/12/2024
// bsLocale="th": 25/12/2567 10:30, 26/12/2567
```

## Migration Notes

### From Previous Version

- Old hardcoded "th-TH" formatting is replaced with dynamic locale detection
- No breaking changes to existing props
- New `bsLocale` prop provides explicit control when needed

### Configuration Requirements

- Ensure user object in AuthContext includes `locale_id` field
- Set appropriate default locale in environment if needed

This feature enhances BSDataGrid to provide culturally appropriate date formatting for international applications! 🌐📅
