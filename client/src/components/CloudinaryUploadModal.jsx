import { useEffect, useRef, useState } from 'react'
import { uploadImageToCloudinary } from '@/utils/cloudinary'

const TABS = [
  { id: 'files', label: 'My Files' },
  { id: 'url', label: 'Web Address' },
  { id: 'camera', label: 'Camera' },
]

function CloudinaryUploadModal({ open, onClose, onUploaded }) {
  const [activeTab, setActiveTab] = useState('files')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    // 모달을 열 때마다 이전 입력/에러 상태 초기화
    setActiveTab('files')
    setDragging(false)
    setUploading(false)
    setError('')
    setWebUrl('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !uploading) onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, uploading])

  if (!open) return null

  const uploadFile = async (file) => {
    if (!file) return

    setError('')
    setUploading(true)

    try {
      const imageUrl = await uploadImageToCloudinary(file)
      onUploaded(imageUrl)
      onClose()
    } catch (uploadError) {
      setError(uploadError.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleBrowse = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    uploadFile(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    uploadFile(file)
  }

  const handleWebUpload = async (event) => {
    event.preventDefault()
    const url = webUrl.trim()

    if (!url) {
      setError('이미지 웹 주소를 입력해 주세요.')
      return
    }

    // 상품 상세 페이지 URL은 HTML이라 Cloudinary가 이미지를 읽지 못함
    const looksLikeDirectImage =
      /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url) ||
      /res\.cloudinary\.com\//i.test(url)

    if (!looksLikeDirectImage) {
      setError(
        '상품 페이지 주소가 아니라, 이미지 파일 주소(.jpg, .png 등)를 입력해 주세요. 또는 My Files 탭에서 Browse로 직접 업로드하세요.',
      )
      return
    }

    setError('')
    setUploading(true)

    try {
      const imageUrl = await uploadImageToCloudinary(url)
      onUploaded(imageUrl)
      onClose()
    } catch (uploadError) {
      const apiMessage = uploadError.message || ''
      if (
        apiMessage.includes('HTML response') ||
        apiMessage.includes('Resource not found')
      ) {
        setError(
          '입력한 주소는 이미지가 아니라 웹페이지입니다. 이미지에 우클릭 → "이미지 주소 복사" 후 다시 시도하거나, My Files에서 업로드하세요.',
        )
      } else {
        setError(apiMessage || '웹 주소 이미지 업로드에 실패했습니다.')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cld-modal" role="dialog" aria-modal="true" aria-label="Upload Widget">
      <button
        type="button"
        className="cld-modal__backdrop"
        aria-label="닫기"
        onClick={() => !uploading && onClose()}
      />

      <div className="cld-modal__panel">
        <header className="cld-modal__tabs">
          <div className="cld-modal__tab-list">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  activeTab === tab.id
                    ? 'cld-modal__tab cld-modal__tab--active'
                    : 'cld-modal__tab'
                }
                onClick={() => {
                  setActiveTab(tab.id)
                  setError('')
                }}
                disabled={uploading}
              >
                <span className="cld-modal__tab-icon" aria-hidden="true">
                  {tab.id === 'files' ? (
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="14" rx="2" />
                      <path d="M8 20h8" />
                    </svg>
                  ) : null}
                  {tab.id === 'url' ? (
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                    </svg>
                  ) : null}
                  {tab.id === 'camera' ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M4 8h4l2-2h4l2 2h4v11H4z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="cld-modal__close"
            aria-label="닫기"
            onClick={() => !uploading && onClose()}
            disabled={uploading}
          >
            ×
          </button>
        </header>

        <div className="cld-modal__body">
          {activeTab === 'files' ? (
            <div
              className={
                dragging
                  ? 'cld-modal__dropzone cld-modal__dropzone--dragging'
                  : 'cld-modal__dropzone'
              }
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setDragging(false)
              }}
              onDrop={handleDrop}
            >
              <div className="cld-modal__cloud" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M44 44H20a12 12 0 0 1 0-24 14 14 0 0 1 27.2-4A10 10 0 1 1 44 44z" />
                  <path d="M32 38V22M32 22l-6 6M32 22l6 6" />
                </svg>
              </div>
              <p className="cld-modal__title">
                {uploading ? 'Uploading...' : 'Drag and Drop an asset here'}
              </p>
              <p className="cld-modal__or">Or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleBrowse}
              />
              <button
                type="button"
                className="cld-modal__browse"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Browse
              </button>
            </div>
          ) : null}

          {activeTab === 'url' ? (
            <form className="cld-modal__url" onSubmit={handleWebUpload}>
              <p className="cld-modal__title">Import from Web Address</p>
              <p className="cld-modal__hint">
                상품 페이지 링크가 아니라, 이미지 파일 주소(.jpg / .png)를
                넣어 주세요.
              </p>
              <input
                type="url"
                value={webUrl}
                onChange={(event) => setWebUrl(event.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={uploading}
              />
              <button type="submit" className="cld-modal__browse" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload URL'}
              </button>
            </form>
          ) : null}

          {activeTab === 'camera' ? (
            <div className="cld-modal__dropzone">
              <div className="cld-modal__cloud" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M12 22h10l4-5h12l4 5h10v26H12z" />
                  <circle cx="32" cy="34" r="9" />
                </svg>
              </div>
              <p className="cld-modal__title">Take a photo</p>
              <p className="cld-modal__or">Or</p>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleBrowse}
              />
              <button
                type="button"
                className="cld-modal__browse"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
              >
                Open Camera
              </button>
            </div>
          ) : null}

          {error ? <p className="cld-modal__error">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default CloudinaryUploadModal
