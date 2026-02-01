/**
 * Mock Debug component for testing useSchemaInputs
 */

const React = require('react');

// Mock Debug component that displays hook state
const MockDebug = ({ 
  form, 
  formFieldRenderers, 
  useFullValidations, 
  setUseFullValidations,
  ...props 
}) => {
  return React.createElement('div', {
    'data-testid': 'MockDebug',
    'data-use-full-validations': useFullValidations,
    'data-form-keys': Object.keys(form || {}).join(','),
    'data-render-fields-count': Object.keys(formFieldRenderers || {}).length,
    form,
    formFieldRenderers,
    useFullValidations,
    setUseFullValidations,
    ...props
  }, [
    React.createElement('div', { key: 'state' }, `useFullValidations: ${useFullValidations}`),
    React.createElement('div', { key: 'form' }, `Form keys: ${Object.keys(form || {}).join(', ')}`),
    React.createElement('div', { key: 'fields' }, `Render fields: ${Object.keys(formFieldRenderers || {}).join(', ')}`),
    React.createElement('button', {
      key: 'toggle',
      onClick: () => setUseFullValidations(!useFullValidations),
      'data-testid': 'toggle-validations'
    }, 'Toggle Validations')
  ]);
};

// Mock Debug component that returns null (for testing when Debug is not provided)
const MockDebugNull = () => null;

// Mock Debug component that throws error (for testing error handling)
const MockDebugWithError = () => {
  throw new Error('Mock Debug component error');
};

module.exports = {
  MockDebug,
  MockDebugNull,
  MockDebugWithError
};
