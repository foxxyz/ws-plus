import jsConfig from '@appliedminds/eslint-config'
import jest from 'eslint-plugin-jest'

export default [
    ...jsConfig,
    jest.configs['flat/recommended']
]