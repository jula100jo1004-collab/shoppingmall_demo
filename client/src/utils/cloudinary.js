const CLOUDINARY_SCRIPT_URL =
  'https://upload-widget.cloudinary.com/latest/global/all.js'

let scriptPromise = null

function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim()
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim()

  if (
    !cloudName ||
    !uploadPreset ||
    cloudName === 'your_cloud_name' ||
    uploadPreset === 'your_unsigned_preset'
  ) {
    throw new Error(
      'Cloudinary 설정이 없습니다. .env의 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET을 확인해 주세요.',
    )
  }

  return { cloudName, uploadPreset }
}

function createUniqueImageFile(file) {
  const extension = file.name?.includes('.')
    ? file.name.split('.').pop()
    : file.type?.split('/')[1] || 'jpg'
  const uniqueName = `product-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`

  return new File([file], uniqueName, {
    type: file.type || 'image/jpeg',
    lastModified: Date.now(),
  })
}

/** 파일 또는 이미지 URL 업로드 */
export async function uploadImageToCloudinary(fileOrUrl) {
  if (!fileOrUrl) {
    throw new Error('업로드할 이미지 파일을 선택해 주세요.')
  }

  const isUrl = typeof fileOrUrl === 'string'
  if (!isUrl && !fileOrUrl.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.')
  }

  const { cloudName, uploadPreset } = getCloudinaryConfig()
  const formData = new FormData()

  // 같은 파일명이면 Cloudinary가 이전 이미지를 재사용하는 경우가 있어 고유 이름으로 업로드
  const uploadFile = isUrl ? fileOrUrl : createUniqueImageFile(fileOrUrl)
  formData.append('file', uploadFile)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const apiMessage = data?.error?.message || ''

    if (apiMessage.includes('whitelisted for unsigned')) {
      throw new Error(
        `Upload Preset "${uploadPreset}"이 Unsigned가 아닙니다. Cloudinary 콘솔에서 Signing mode를 Unsigned로 바꿔 주세요.`,
      )
    }

    throw new Error(apiMessage || 'Cloudinary 이미지 업로드에 실패했습니다.')
  }

  const imageUrl = data.secure_url || data.url
  if (!imageUrl) {
    throw new Error('업로드는 되었지만 이미지 URL을 받지 못했습니다.')
  }

  return imageUrl
}

function loadCloudinaryScript() {
  if (window.cloudinary?.createUploadWidget) {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${CLOUDINARY_SCRIPT_URL}"]`,
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () =>
          reject(new Error('Cloudinary 위젯 스크립트를 불러오지 못했습니다.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = CLOUDINARY_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Cloudinary 위젯 스크립트를 불러오지 못했습니다.'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

function getCloudinaryErrorMessage(error, result) {
  if (typeof error === 'string' && error.trim()) return error
  if (error?.message) return error.message
  if (result?.info?.message) return result.info.message
  if (typeof result?.info === 'string') return result.info
  return '이미지 업로드에 실패했습니다. Upload Preset이 Unsigned인지 확인해 주세요.'
}

/** Cloudinary Upload Widget */
export async function openCloudinaryWidget({
  onSuccess,
  onError,
  onClose,
} = {}) {
  const { cloudName, uploadPreset } = getCloudinaryConfig()

  await loadCloudinaryScript()

  if (!window.cloudinary?.createUploadWidget) {
    throw new Error(
      'Cloudinary 위젯이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    )
  }

  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName,
      uploadPreset,
      sources: ['local', 'url', 'camera'],
      multiple: false,
      maxFiles: 1,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    },
    (error, result) => {
      if (error) {
        onError?.(getCloudinaryErrorMessage(error, result))
        return
      }

      if (result?.event === 'success') {
        const imageUrl = result.info?.secure_url || result.info?.url
        if (!imageUrl) {
          onError?.('업로드는 되었지만 이미지 URL을 받지 못했습니다.')
          return
        }
        onSuccess?.(imageUrl, result.info)
        return
      }

      if (result?.event === 'close' || result?.event === 'abort') {
        onClose?.()
      }
    },
  )

  widget.open()
  return widget
}
