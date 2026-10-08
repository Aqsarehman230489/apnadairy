// Optional image picking. expo-image-picker is a native module that may not
// be installed in every build — this helper degrades gracefully to null.

/** File picked for upload (react-native form-data shape). */
export interface UploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

declare const require: { (id: string): any } | undefined;

export async function pickImage(): Promise<UploadFile | null> {
  try {
    if (typeof require === 'undefined') return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ImagePicker = require('expo-image-picker');
    if (!ImagePicker?.launchImageLibraryAsync) return null;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm?.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'Images',
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    const name = asset.fileName || `photo_${Date.now()}.jpg`;
    return { uri: asset.uri, name, mimeType: asset.mimeType || 'image/jpeg' };
  } catch {
    return null;
  }
}
