let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
}

function mergeConfig(baseConfig, userConfig) {
  if (!userConfig) {
    return baseConfig
  }

  // Create a deep copy of the base config
  const mergedConfig = { ...baseConfig }
  
  // ESM imports will have a "default" property
  const config = userConfig.default || userConfig

  for (const key in config) {
    if (
      typeof mergedConfig[key] === 'object' &&
      !Array.isArray(mergedConfig[key])
    ) {
      mergedConfig[key] = {
        ...mergedConfig[key],
        ...config[key],
      }
    } else {
      mergedConfig[key] = config[key]
    }
  }

  return mergedConfig
}

export default mergeConfig(nextConfig, userConfig)
