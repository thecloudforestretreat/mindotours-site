# mindotours-site
Mindo Tours landing site

## Performance maintenance (2026-10-09)

Public homepage imagery uses sized WebP copies; originals remain unchanged. Preserve matching English/Spanish pages when editing their image references. Niebli and the Retreat serve the existing brand fonts from assets/fonts with their OFL licenses. Regenerate optimized variants after replacing source photographs, preserving aspect ratio and mobile cropping. Test consent, navigation, responsive layouts and Lighthouse before deployment.

The EN/ES homepage uses assets/css/homepage-bundle.css, generated with `node scripts/build-homepage-css.mjs`; rebuild after changes to any of its four source stylesheets. On 2026-10-09 the published GTM container (v1) had no tags. `analytics.gtmEnabled` is false to skip its unused download; the existing direct GA4 event sender remains active. Enable GTM in site-config only when publishing and verifying the container ownership/cutover configuration.
