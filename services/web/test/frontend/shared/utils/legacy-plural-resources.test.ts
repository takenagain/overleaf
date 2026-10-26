import { expect } from 'chai'
import { createInstance } from 'i18next'
import { legacyPluralResources } from '@/utils/legacy-plural-resources'

describe('legacy plural locale resources', function () {
  it('preserves singular, plural and interpolation with current i18next', async function () {
    const i18n = createInstance()
    await i18n.init({
      lng: 'en',
      resources: {
        en: {
          translation: legacyPluralResources({
            item: '__count__ item',
            item_plural: '__count__ items',
            address_line_1: 'Address',
          }),
        },
      },
      interpolation: { prefix: '__', suffix: '__' },
    })
    expect(i18n.t('item', { count: 1 })).to.equal('1 item')
    expect(i18n.t('item', { count: 0 })).to.equal('0 items')
    expect(i18n.t('item', { count: 2 })).to.equal('2 items')
    expect(i18n.t('address_line_1')).to.equal('Address')
  })

  it('uses the unsuffixed translation for languages with a single plural form', async function () {
    const i18n = createInstance()
    await i18n.init({
      lng: 'ja',
      resources: {
        ja: {
          translation: legacyPluralResources(
            { item: '項目', item_plural: 'unused' },
            'ja'
          ),
        },
      },
    })
    expect(i18n.t('item', { count: 1 })).to.equal('項目')
    expect(i18n.t('item', { count: 2 })).to.equal('項目')
  })
})
