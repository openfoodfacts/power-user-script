# power-user-script
User script for your browser, to empower [Open Food Facts](https://world.openfoodfacts.org/)  contribution. Power User Script is a kind of laboratory, to explore new features before they can get into Open Food Facts.

Some features:
* keyboard shortcuts to different pages: product edition (e), product JSON (a), view mode (v), etc.
* styling improvements via CSS: barcode highlighted, fields highlighted, etc.
* show/hide barcode
* show/hide helpers
* sidebar quick links: page translation, category translation, Recent Changes, Hunger Game...
* inline edit of ingredients
* information enhancements beside barcode number: links to Google search, Open Beauty Facts, etc.
* information enhancements in the confirmation page: product issues, going further, etc.
* recent changes filter (filter as you type)
* etc. See complete list in the "changelog" or directly in JS code

# Install
To run userscripts it's best to have a script manager installed. Userscript managers are available as browser extensions:

* Greasemonkey  – works with Firefox - https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/
* Tampermonkey  – works with Chrome, Safari, Firefox and other browsers - http://tampermonkey.net/

Choose an appropriate manager and install it according to the requirements of your browser.

Once your script manager is installed you can go to https://github.com/openfoodfacts/power-user-script/blob/master/OpenFoodFactsPower.user.js

Just click on the Raw button and your script manager will ask you if you want to install the script.

# Changelog
### 2025-01-17T12:00
* Refactored API calls to use helper functions (preparation for openfoodfacts-js integration)
* Added OFFApiHelpers utility functions for better code organization
* Improved barcode extraction from URLs using centralized helper
* Code cleanup and preparation for future integration with official openfoodfacts-js library
### 2025-06-17T18:50
* Now using Open Food Facts' API v2 (no functionnal change)
* Include link to Open Prices on product pages
* Remove old code related to OxF duplicates, not useful anymore (technical debt)
### 2024-12-20T11:15
* Fix moving products to OPF, OBF, OPFF
### 2024-08-27T19:25
* Exclude search.openfoodfacts.org
### 2024-06-19T14:18
* Exclude prices.openfoodfacts.org
* Fix kJ/kcal ratio to 4.2 instead of 4.4
### 2024-02-02T20:39
* Product list: rotate images
### 2024-01-03T13:20
* Search as you type to filter changes. Useful for many cases:
  * find **add**itions or **change**s
  * monitor changes for specific fields
  * monitor changes from specific users
### 2024-01-03T11:20
* Products' list: add button to each product to open Hunger Game
### 2023-12-22T10:15
* Add option to display barcodes by default
### 2023-09-15T22:59
* Edit mode: compute and display energy in real-time
### 2023-09-13T23:00
* Let panels use less space
### 2023-08-24T18:56
* Add "History" anchor in the nav bar
* Check serving size field
* Colorize icon ⇅ when kJ/kcal values are not coherent (ratio is displayed inside ⇅ tooltip)
* Small UI improvements (smaller fixed validation bar)
* Better organization of the code; more code in vanilla JS (faster and less dependant from libraries)
### 2023-05-04T23:39
* Button ⇅ to reverse kj/kcal
* "No quality errors" is back
### 2023-03-20T12:38
* Hack to prevent product opener regression in saved-product page
### 2022-12-22T15:30
* Distraction free mode: Open Food Facts top bar is hidden. Option to check or uncheck (by default) in the settings.
* The nutrition facts form has many improvements: now fits in one screen on a HD display at 100%.
### 2022-12-19T08:20
* fix nutrition image size on Chrome and Safari
### 2022-12-08T08:20
* Delete hunger games links which are now in Product Opener.
* CSS tweaks:
  * nutrition facts table more condensed
  * products issues are well displayed
### 2022-10-19T15:11
* Categories, brands and labels' facets: added Hunger Game deep link as a button right after the title
* Edition:
  * Quick and dirty hack to control and manage kj/kcal inversion
  * Control fiber field
* Remove "edit" button feature in list mode (added in Product Opener)
* Fix some regressions due to Open Food Facts redesign of 2022-10
### 2021-12-06T13:55
* Add a deep link to Hunger Game for brand on product's page
### 2021-10-20T16:31
* Add "n" keyboard shortcut in list mode to reload the list without cache (&nocache=1 parameter)
### 2021-03-30T02:36
* Add ->OPetFF button in list mode (to move products to Open Pet Food Facts), and improve error handling
### 2021-03-26T10:48
* Add ->OPF button in list mode (to move products to Open Products Facts)
* Recent changes link displays 100# instead of 900#
### 2021-03-25T18:18
* Exclude https://analytics.openfoodfacts.org/
### 2021-03-21T20:44
* Fix product list view tweaks to work with new layout
### 2020-12-12T16:32
* Exclude https://support.openffodfacts.org
### 2020-10-29T18:00
* Add graphical barcodes to list view (shift-B) (Issue #26)
### 2020-10-17T08:30
* Add option to set ingredient textareas to fixed width font, to make it easier to see bad OCR, such as when it confuses "m" and "rn" (e.g. corn), lowercase l/L and uppercase i/I, letter O with number 0, etc.
### 2020-10-15T08:35
* minor fixes and code tidying
### 2020-10-14T11:53
* fixes from @svensven (thanks!)
* Categorization opportunities link
* Add DuckDuckGo link for product barcode (near the barcode)
### 2020-06-26T16:33
* Deep link to Hunger Game when the page is related to a category, label or brand
* exclude wiki pages from script
### 2020-05-04T10:39
* Modify link to hunger game
* Nutrition facts picture takes all the place available: should work for every modern browser (CSS3)
* very small update, the "a" key now opens the json page in a new window (instead of Alt+Shift+A)
### 2020-04-17T14:33
* Confirmation page: quality errors and quality warnings displayed in red (or green when it's all right)
* Google Link for product barcode (near the barcode)
* Link to Open Pet Food Facts (near the barcode)
* Firefox: Nutrition facts picture takes all the place available
### 2020-04-11T17:26
* Add openbeautyfacts.org link and its status code (200 = the product exists; 404 it doesn't)
* Add .pro.openffodfacts.org link (status code isn't working)
* Add "ingredient mode" to simplify ingredients management => ("i" key in "edit" mode)
* Developper: console.log messages more clear
### 2020-03-24TT11:12
* Add a field to filter Recent Changes results (filter as you type)
### 2020-01-09T16:54
* Add version date to flag feature
### 2019-12-16T17:27
* Add Hunger Game link
* Various fixes
### 2019-12-09T18:34
* Change "?" menu position
### 2019-12-04T15:15
* Edit mode: show/hide field help comments
### 2019-11-22T08:33
* flagging improvement 
  * allow flagging on page which is not a revision
  * add product_improvement
* reorganize menu and add separators
### 2019-11-19T11:40
* Detect pro platform + add product public URL
### 2019-11-18T16:54
* Add quick links in the sidebar
* Refactor help box
### 2019-11-04T09:33
* change @updateURL to https://github.com/openfoodfacts/power-user-script/raw/master/OpenFoodFactsPower.user.js
* comment code made for easier to read number of products because of https://github.com/openfoodfacts/openfoodfacts-server/issues/2474
### 2019-10-23T13:42
* number of products easier to read (with separators depending on your locale); see: https://github.com/openfoodfacts/openfoodfacts-server/issues/2474
### 2019-09-12T16:45
* initial publication on this current Github repo
