import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

type ModuleAssetConfig = {
  id: string;
  assetModule: number;
  filename?: string;
  bundleRelativePath?: never;
};

type NativeBundleAssetConfig = {
  id: string;
  bundleRelativePath: string;
  filename?: string;
  assetModule?: never;
};

export type ModelAssetConfig = ModuleAssetConfig | NativeBundleAssetConfig;

const MODEL_DIRECTORY = `${FileSystem.documentDirectory}models/`;

export async function ensureModelAsset(
  config: ModelAssetConfig,
  options: { forceRefresh?: boolean } = {}
): Promise<string> {
  const targetFilename = config.filename ?? `${config.id}.gguf`;
  const destination = `${MODEL_DIRECTORY}${targetFilename}`;

  await FileSystem.makeDirectoryAsync(MODEL_DIRECTORY, { intermediates: true });

  if (!options.forceRefresh) {
    const existing = await FileSystem.getInfoAsync(destination);
    if (existing.exists) {
      return destination;
    }
  }

  if ('assetModule' in config) {
    const asset = Asset.fromModule(config.assetModule);
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error(`Missing local URI for asset ${config.id}`);
    }

    await FileSystem.copyAsync({
      from: asset.localUri,
      to: destination,
    });

    return destination;
  }

  const bundleDir = FileSystem.bundleDirectory ?? '';
  const relativePath = config.bundleRelativePath.replace(/^\//, '');
  const candidateSources: string[] = [`${bundleDir}${relativePath}`];

  if (__DEV__) {
    console.info('[modelLoader] bundle check', {
      platform: Platform.OS,
      bundleDir,
      relativePath,
    });
  }

  if (Platform.OS === 'ios') {
    candidateSources.push(`${bundleDir}Supporting/${relativePath}`);
    const filename = relativePath.split('/').pop();
    if (filename) {
      candidateSources.push(`${bundleDir}${filename}`);
    }
  }

  let resolvedSource: string | null = null;
  for (const candidate of candidateSources) {
    // eslint-disable-next-line no-await-in-loop
    const info = await FileSystem.getInfoAsync(candidate);
    if (info.exists) {
      resolvedSource = candidate;
      if (__DEV__) {
        console.info('[modelLoader] using source', candidate);
      }
      break;
    }
    if (__DEV__) {
      console.info('[modelLoader] candidate missing', candidate);
    }
  }

  if (!resolvedSource) {
    throw new Error(
      `번들에서 모델 파일을 찾을 수 없습니다. ${config.bundleRelativePath} 위치에 GGUF를 추가했는지 확인하세요.`
    );
  }

  if (__DEV__) {
    console.info('[modelLoader] copying model file', {
      resolvedSource,
      destination,
    });
  }

  return copyModelFile(resolvedSource, destination);
}

async function copyModelFile(source: string, destination: string) {
  await FileSystem.copyAsync({
    from: source,
    to: destination,
  });

  return destination;
}

export async function removeModelAsset(id: string, filename?: string) {
  const targetFilename = filename ?? `${id}.gguf`;
  const destination = `${MODEL_DIRECTORY}${targetFilename}`;
  const existing = await FileSystem.getInfoAsync(destination);

  if (existing.exists) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
  }
}

export function getModelPath(id: string, filename?: string) {
  const targetFilename = filename ?? `${id}.gguf`;
  return `${MODEL_DIRECTORY}${targetFilename}`;
}
