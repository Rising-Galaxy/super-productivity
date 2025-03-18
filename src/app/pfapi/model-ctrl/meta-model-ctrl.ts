import { Database } from '../db/database';
import { MetaFileContent, ModelBase, ModelCfg } from '../pfapi.model';
import { pfLog } from '../util/log';
import { getEnvironmentId } from '../util/get-environment-id';

const DEFAULT_META_MODEL: MetaFileContent = {
  crossModelVersion: 1,
  revMap: {},
  modelVersions: {},
};

export class MetaModelCtrl {
  static readonly META_MODEL_ID = '__meta_';
  static readonly META_MODEL_REMOTE_FILE_NAME = '__meta_';
  static readonly CLIENT_ID = '__client_id_';

  private readonly _db: Database;
  private _metaModelInMemory?: MetaFileContent;
  private _clientIdInMemory?: string;

  constructor(db: Database) {
    this._db = db;
  }

  async onModelSave<MT extends ModelBase>(
    modelId: string,
    modelCfg: ModelCfg<MT>,
  ): Promise<unknown> {
    pfLog(`${MetaModelCtrl.name}.${this.onModelSave.name}()`, modelId, modelCfg);

    const timestamp = Date.now();
    if (modelCfg.isLocalOnly) {
      return Promise.resolve();
    }

    const metaModel = await this.loadMetaModel();
    const isModelVersionChange =
      metaModel.modelVersions[modelId] !== modelCfg.modelVersion;
    return this._updateMetaModel({
      lastLocalSyncModelUpdate: timestamp,
      ...(isModelVersionChange
        ? {
            modelVersions: {
              ...metaModel.modelVersions,
              [modelId]: modelCfg.modelVersion,
            },
          }
        : {}),
    });
  }

  private async _updateMetaModel(
    metaModelUpdate: Partial<MetaFileContent>,
  ): Promise<unknown> {
    pfLog(`${MetaModelCtrl.name}.${this._updateMetaModel.name}()`, metaModelUpdate);
    this._metaModelInMemory = {
      ...(await this.loadMetaModel()),
      ...metaModelUpdate,
    };
    return this.saveMetaModel(this._metaModelInMemory);
  }

  saveMetaModel(metaModel: MetaFileContent): Promise<unknown> {
    pfLog(`${MetaModelCtrl.name}.${this.saveMetaModel.name}()`, metaModel);
    this._metaModelInMemory = metaModel;
    return this._db.save(MetaModelCtrl.META_MODEL_ID, metaModel);
  }

  async loadMetaModel(): Promise<MetaFileContent> {
    pfLog(`${MetaModelCtrl.name}.${this.loadMetaModel.name}()`, this._metaModelInMemory);
    if (this._metaModelInMemory) {
      return this._metaModelInMemory;
    }

    const data = (await this._db.load(MetaModelCtrl.META_MODEL_ID)) as MetaFileContent;
    // Initialize if not found
    if (!data) {
      this._metaModelInMemory = { ...DEFAULT_META_MODEL };
      return this._metaModelInMemory;
    }

    this._metaModelInMemory = data;
    return data;
  }

  async loadClientId(): Promise<string> {
    if (this._clientIdInMemory) {
      return this._clientIdInMemory;
    }
    const clientId = await this._db.load(MetaModelCtrl.CLIENT_ID);
    if (typeof clientId !== 'string') {
      throw new Error('Client ID not found');
    }
    return clientId;
  }

  private _saveClientId(clientId: string): Promise<unknown> {
    this._clientIdInMemory = clientId;
    return this._db.save(MetaModelCtrl.CLIENT_ID, clientId);
  }

  private _generateClientId(): string {
    pfLog(`${MetaModelCtrl.name}.${this._generateClientId.name}()`);
    return getEnvironmentId() + '_' + Date.now();
  }
}
