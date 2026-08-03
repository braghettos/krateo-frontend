module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-css-modules'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    'selector-class-pattern': null,
  },
}
