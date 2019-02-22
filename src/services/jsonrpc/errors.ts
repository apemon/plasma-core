import { JSONRPCError } from '../models/rpc';

export const JSONRPC_ERRORS: { [key: string]: JSONRPCError } = {
  PARSE_ERROR: {
    code: -32700,
    message: 'Parse error'
  },
  INVALID_REQUEST: {
    code: -32600,
    message: 'Invalid request'
  },
  METHOD_NOT_FOUND: {
    code: -32601,
    message: 'Method not found'
  },
  INVALID_PARAMS: {
    code: -32602,
    message: 'Invalid params'
  },
  INTERNAL_ERROR: {
    code: -32603,
    message: 'Internal error'
  }
};
