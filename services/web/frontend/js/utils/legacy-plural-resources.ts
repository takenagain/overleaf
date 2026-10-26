/** Translate the existing two-form locale resources to i18next's Intl suffixes. */
export function legacyPluralResources(
  resources: Record<string, string>,
  language = 'en'
) {
  const converted = { ...resources }
  const singleForm =
    new Intl.PluralRules(language).resolvedOptions().pluralCategories.length ===
    1
  for (const [key, value] of Object.entries(resources)) {
    if (!key.endsWith('_plural')) continue
    const base = key.slice(0, -'_plural'.length)
    // Locale files use the unsuffixed key for singular and _plural for all other counts.
    if (resources[base] !== undefined)
      converted[`${base}_one`] = resources[base]
    for (const category of ['zero', 'two', 'few', 'many', 'other']) {
      converted[`${base}_${category}`] = singleForm
        ? (resources[base] ?? value)
        : value
    }
  }
  return converted
}
