import {
  useEffect,
  type ReactElement,
} from 'react'

type SalesDocumentPrintProps = {
  children: ReactElement
  onFinished: (
    error: string | null,
  ) => void
}

function waitForImage(
  image: HTMLImageElement,
): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(
          new Error(
            'No fue posible cargar una imagen del documento.',
          ),
        )
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener(
        'load',
        handleLoad,
      )
      image.removeEventListener(
        'error',
        handleError,
      )
    }

    const handleLoad = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(
        new Error(
          'No fue posible cargar una imagen del documento.',
        ),
      )
    }

    image.addEventListener(
      'load',
      handleLoad,
      { once: true },
    )
    image.addEventListener(
      'error',
      handleError,
      { once: true },
    )
  })
}

async function prepareDocument(
  element: HTMLElement,
): Promise<void> {
  await Promise.all(
    Array.from(
      element.querySelectorAll('img'),
    ).map(waitForImage),
  )

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve()
        })
    })
  })
}

export function SalesDocumentPrint({
  children,
  onFinished,
}: SalesDocumentPrintProps) {
  useEffect(() => {
    let cancelled = false

    async function printDocument() {
      let error: string | null = null

      try {
        const printableElement =
          document.querySelector<HTMLElement>(
            '.quotation-print-area',
          )

        if (!printableElement) {
          throw new Error(
            'No fue posible encontrar el documento.',
          )
        }

        await prepareDocument(
          printableElement,
        )

        if (!cancelled) {
          window.print()
        }
      } catch (caughtError) {
        error =
          caughtError instanceof Error
            ? caughtError.message
            : 'No fue posible preparar el documento.'
      }

      if (!cancelled) {
        onFinished(error)
      }
    }

    void printDocument()

    return () => {
      cancelled = true
    }
  }, [onFinished])

  return children
}