import { inject, Injectable } from '@angular/core';
import { CompleteBackup, ModelCfgToModelCtrl, Pfapi } from './api';
import { Subject } from 'rxjs';
import { AllowedDBKeys, LS } from '../core/persistence/storage-keys.const';
import { isValidAppData } from '../imex/sync/is-valid-app-data.util';
import { devError } from '../util/dev-error';
import {
  AppDataCompleteNew,
  CROSS_MODEL_VERSION,
  PFAPI_CFG,
  PFAPI_MODEL_CFGS,
  PFAPI_SYNC_PROVIDERS,
  PfapiAllModelCfg,
} from './pfapi-config';
import { T } from '../t.const';
import { TranslateService } from '@ngx-translate/core';

const MAX_INVALID_DATA_ATTEMPTS = 10;

@Injectable({
  providedIn: 'root',
})
export class PfapiService {
  private _translateService = inject(TranslateService);

  public readonly pf = new Pfapi(PFAPI_MODEL_CFGS, PFAPI_SYNC_PROVIDERS, PFAPI_CFG);
  public readonly m: ModelCfgToModelCtrl<PfapiAllModelCfg> = this.pf.m;

  // TODO replace with pfapi event
  onAfterSave$: Subject<{
    appDataKey: AllowedDBKeys;
    data: unknown;
    isDataImport: boolean;
    isSyncModelChange: boolean;
    projectId?: string;
  }> = new Subject();

  private _invalidDataCount = 0;

  getAllSyncModelData = this.pf.getAllSyncModelData.bind(this.pf);
  importAllSycModelData = this.pf.importAllSycModelData.bind(this.pf);
  isValidateComplete = this.pf.isValidateComplete.bind(this.pf);
  repairCompleteData = this.pf.repairCompleteData.bind(this.pf);
  getCompleteBackup = this.pf.loadCompleteBackup.bind(this.pf);

  // importCompleteBackup = this.pf.importCompleteBackup.bind(this.pf);

  constructor() {
    this._isCheckForStrayLocalDBBackupAndImport();
  }

  importCompleteBackup(
    data: AppDataCompleteNew | CompleteBackup<PfapiAllModelCfg>,
  ): Promise<void> {
    return 'crossModelVersion' in data && 'timestamp' in data
      ? this.importAllSycModelData({
          data: data.data,
          crossModelVersion: data.crossModelVersion,
          isBackupData: false,
          isAttemptRepair: false,
        })
      : this.importAllSycModelData({
          data,
          crossModelVersion: CROSS_MODEL_VERSION,
          isBackupData: false,
          isAttemptRepair: false,
        });
  }

  // TODO improve on this
  async getValidCompleteData(): Promise<AppDataCompleteNew> {
    const d = (await this.getAllSyncModelData()) as AppDataCompleteNew;
    // if we are very unlucky (e.g. a task has updated but not the related tag changes) app data might not be valid. we never want to sync that! :)
    if (isValidAppData(d)) {
      this._invalidDataCount = 0;
      return d;
    } else {
      // TODO remove as this is not a real error, and this is just a test to check if this ever occurs
      devError('Invalid data => RETRY getValidCompleteData');
      this._invalidDataCount++;
      if (this._invalidDataCount > MAX_INVALID_DATA_ATTEMPTS) {
        throw new Error('Unable to get valid app data');
      }
      return this.getValidCompleteData();
    }
  }

  // async clearDatabaseExceptBackupAndLocalOnlyModel(): Promise<void> {
  //   const backup: AppDataCompleteNew | null = await this.pf.tmpBackupService.load();
  //   await this.pf.clearDatabaseExceptLocalOnly();
  //   if (backup) {
  //     await this.pf.tmpBackupService.save(backup);
  //   }
  // }

  private async _loadAllFromDatabaseToStore(): Promise<any> {
    // return await Promise.all([
    //   // reload view model from ls
    //   this._dataInitService.reInit(true),
    //   this._reminderService.reloadFromDatabase(),
    // ]);
  }

  private async _isCheckForStrayLocalDBBackupAndImport(): Promise<boolean> {
    const backup = await this.pf.tmpBackupService.load();
    if (!localStorage.getItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP)) {
      if (backup) {
        await this.pf.tmpBackupService.clear();
      }
      localStorage.setItem(LS.CHECK_STRAY_PERSISTENCE_BACKUP, 'true');
    }
    if (backup) {
      if (confirm(this._translateService.instant(T.CONFIRM.RESTORE_STRAY_BACKUP))) {
        await this.importAllSycModelData({
          data: backup,
          crossModelVersion: CROSS_MODEL_VERSION,
          isBackupData: false,
          isAttemptRepair: false,
        });
        return true;
      } else {
        if (confirm(this._translateService.instant(T.CONFIRM.DELETE_STRAY_BACKUP))) {
          await this.pf.tmpBackupService.clear();
        }
      }
    }
    return false;
  }
}
