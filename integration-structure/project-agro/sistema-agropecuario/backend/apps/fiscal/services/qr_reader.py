import logging
from io import BytesIO

try:
    import cv2
    import numpy as np
    from pyzbar import pyzbar
except ImportError:
    cv2 = None
    np = None
    pyzbar = None

try:
    from PIL import Image
except ImportError:
    Image = None

logger = logging.getLogger(__name__)

class QRCodeService:
    """Serviço Desacoplado para Processamento de QR Codes e Uploads OCR."""
    @staticmethod
    def extract_qr_from_image(image_bytes):
        if not cv2 or not np or not pyzbar:
            raise ImportError("Dependências de processamento de imagem ausentes (cv2, pyzbar, numpy)")
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        decoded = pyzbar.decode(img)
        if decoded:
            return decoded[0].data.decode("utf-8")
        
        # Fallback PIL
        if Image:
            pil_img = Image.open(BytesIO(image_bytes))
            decoded_pil = pyzbar.decode(pil_img)
            if decoded_pil:
                return decoded_pil[0].data.decode("utf-8")
        return None
