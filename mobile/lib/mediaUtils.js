import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const BASE_DIR = `${FileSystem.documentDirectory}Arcadian/`;
const VOUCHERS_DIR = `${BASE_DIR}Vouchers/`;
const MEDIA_DIR = `${BASE_DIR}Media/`;

/**
 * Initialize directory structure
 */
export const initStorage = async () => {
  try {
    const dirs = [BASE_DIR, VOUCHERS_DIR, MEDIA_DIR];
    for (const dir of dirs) {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  } catch (error) {
    console.error('Failed to init storage:', error);
  }
};

/**
 * Get local path for a voucher image
 */
export const getVoucherLocalPath = (voucherNo, fileName) => {
  return `${VOUCHERS_DIR}${voucherNo}/${fileName}`;
};

/**
 * Get local path for a chat media
 */
export const getChatMediaLocalPath = (chatId, fileName) => {
  return `${MEDIA_DIR}${chatId}/${fileName}`;
};

/**
 * Check if file exists locally
 */
export const checkFileExists = async (uri) => {
  if (!uri) return false;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists;
};

/**
 * Download file to local storage with progress
 */
export const downloadFile = async (remoteUrl, localPath, onProgress) => {
  try {
    // Ensure parent directory exists
    const dir = localPath.substring(0, localPath.lastIndexOf('/'));
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      remoteUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(progress);
      }
    );

    const { uri } = await downloadResumable.downloadAsync();
    return uri;
  } catch (error) {
    console.error('Download failed:', error);
    return null;
  }
};

/**
 * Save to Media Library (Gallery)
 */
export const saveToGallery = async (localUri) => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return false;
    
    await MediaLibrary.saveToLibraryAsync(localUri);
    return true;
  } catch (error) {
    console.error('Failed to save to gallery:', error);
    return false;
  }
};
