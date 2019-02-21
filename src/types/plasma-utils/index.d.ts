declare module 'plasma-utils' {
  import BigNum = require('bn.js');

  namespace utils {
    function isString(value: any): boolean;
    function sleep(ms: number): Promise<void>;
  }

  namespace serialization {
    namespace models {
      class BaseModel {
        constructor(args: any);
        encoded: string;
      }

      class Signature extends BaseModel {
        v: string;
        r: string;
        s: string;
      }

      class Transfer extends BaseModel {
        sender: string;
        recipient: string;
        token: BigNum;
        start: BigNum;
        end: BigNum;
      }

      class UnsignedTransaction extends BaseModel {
        block: BigNum;
        hash: string;
        transfers: Transfer[];
      }

      class SignedTransaction extends UnsignedTransaction {
        signatures: Signature[];
      }

      class TransferProof extends BaseModel {
        parsedSum: BigNum;
        leafIndex: BigNum;
        signature: Signature;
        inclusionProof: string[];
      }

      class TransactionProof extends BaseModel {
        transferProofs: TransferProof[];
      }
    }
  }
}