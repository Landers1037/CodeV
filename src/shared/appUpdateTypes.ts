/** 应用更新结果状态。 */
export type AppUpdateStatus = 'up-to-date' | 'no-release' | 'downloaded' | 'cached' | 'error';

/** 应用更新结果。 */
export interface AppUpdateResult {
  /** 结果状态。 */
  status: AppUpdateStatus;
  /** 当前版本。 */
  currentVersion: string;
  /** 最新版本。 */
  latestVersion: string;
  /** 安装包文件名。 */
  fileName: string;
  /** 安装包路径。 */
  targetPath: string;
  /** 提示信息。 */
  message: string;
}
