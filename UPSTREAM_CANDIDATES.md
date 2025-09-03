# Functions to Upstream to openfoodfacts-js

This document lists useful functions present in the Power User Script that could be beneficial to upstream to the official openfoodfacts-js library.

## Utility Functions

### 1. Barcode Formatting and Validation
**Location:** `OFFApiHelpers.formatBarcode()`
**Purpose:** Cleans and validates barcode format
**Benefits:** 
- Removes non-digit characters
- Validates length (8, 12, 13, or 14 digits)
- Provides consistent barcode formatting across applications

### 2. Product Image URL Builder  
**Location:** `OFFApiHelpers.getProductImageUrl()`
**Purpose:** Constructs product image URLs from barcode and image type
**Benefits:**
- Handles barcode padding and path segmentation
- Supports different image sizes (100, 200, 400, full)
- Already partially implemented in openfoodfacts-js as `getProductImageUrl()`

### 3. Barcode Extraction from URLs
**Location:** `OFFApiHelpers.extractBarcodeFromUrl()`  
**Purpose:** Extracts barcode from product URLs
**Benefits:**
- Useful for parsing canonical URLs
- Handles various URL formats
- Could support multiple domain patterns

### 4. Domain Detection and Configuration
**Location:** `OFFApiHelpers.getCurrentDomain()`
**Purpose:** Automatically detects current OFF domain and language
**Benefits:**
- Supports different OFF domains (world, country-specific)
- Auto-detects language from page
- Useful for client initialization

## UI Enhancement Functions

### 5. Keyboard Shortcut System
**Purpose:** Provides standardized keyboard shortcuts for common actions
**Current shortcuts:**
- `a` - API page
- `e` - Edit mode  
- `v` - View mode
- `?` or `h` - Help
**Benefits:** Could provide a standard interface for OFF applications

### 6. Barcode Display Utilities
**Purpose:** Enhanced barcode rendering and toggle functionality
**Benefits:**
- SVG barcode generation with JsBarcode
- Show/hide functionality
- Could be useful in mobile apps

### 7. Product URL Builders
**Location:** `OFFApiHelpers.buildProductUrls()`
**Purpose:** Generates all relevant URLs for a product
**Benefits:**
- Centralized URL construction
- Supports view, edit, API, and image URLs
- Domain-aware URL building

## Quality of Life Improvements

### 8. Error Handling Patterns
**Purpose:** Consistent error handling for API calls
**Benefits:**
- Standardized error messages
- Graceful degradation
- User-friendly error reporting

### 9. Logging Utilities  
**Purpose:** Conditional console logging for development
**Benefits:**
- Toggle-able debug output
- Structured logging format
- Performance monitoring

## Integration Notes

These functions demonstrate common use patterns that would benefit the broader Open Food Facts ecosystem:

1. **Browser Environment Support** - Many functions handle browser-specific APIs
2. **User Experience Patterns** - Keyboard shortcuts and UI enhancements
3. **Data Validation** - Input cleaning and validation helpers
4. **URL Management** - Comprehensive URL building and parsing

## Recommended Implementation

1. Start with utility functions (barcode formatting, URL builders)
2. Add UI helper functions as optional modules
3. Provide keyboard shortcut system as a separate plugin
4. Consider browser-specific adaptations

These functions could be contributed to openfoodfacts-js as:
- Core utilities (barcode, URL functions)
- Browser-specific helpers (DOM manipulation, shortcuts)
- Optional UI enhancement modules