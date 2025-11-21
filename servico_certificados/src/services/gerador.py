import io
import uuid
import hashlib
import qrcode
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

class PDFGeneratorService:
    
    @staticmethod
    def gerar_hash(dados: dict) -> str:
        raw = f"{dados['inscricao_id']}-{dados['evento_id']}-{dados['usuario_id']}-{uuid.uuid4()}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()

    @staticmethod
    def gerar_pdf_bytes(cert_data) -> io.BytesIO:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=landscape(A4))
        width, height = landscape(A4)
        
        # Seleciona o desenhista com base no template
        template = cert_data.template_nome.lower()
        
        if template == 'tech':
            _draw_tech_style(c, width, height, cert_data)
        elif template == 'saude':
            _draw_health_style(c, width, height, cert_data)
        elif template == 'educacao':
            _draw_education_style(c, width, height, cert_data)
        else:
            _draw_default_style(c, width, height, cert_data)

        c.showPage()
        c.save()
        buffer.seek(0)
        return buffer

# --- ESTILOS VISUAIS ---

def _draw_default_style(c, w, h, data):
    """Estilo Clássico / Corporativo"""
    # Borda Azul
    c.setStrokeColor(colors.darkblue)
    c.setLineWidth(5)
    c.rect(1*cm, 1*cm, w-2*cm, h-2*cm)
    
    # Textos
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(w/2, h - 5*cm, "CERTIFICADO DE PARTICIPAÇÃO")
    
    c.setFont("Helvetica", 18)
    c.drawCentredString(w/2, h - 8*cm, "Certificamos que")
    
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(colors.darkblue)
    c.drawCentredString(w/2, h - 10*cm, data.participante_nome)
    
    c.setFont("Helvetica", 18)
    c.setFillColor(colors.black)
    c.drawCentredString(w/2, h - 12*cm, f"participou do evento {data.evento_nome}")
    c.drawCentredString(w/2, h - 13.5*cm, f"realizado em {data.evento_data}")

    _draw_validation_footer(c, w, 2*cm, data.codigo_unico, colors.gray)

def _draw_tech_style(c, w, h, data):
    """Estilo Tecnologia (Dark/Neon)"""
    # Fundo Escuro (Simulado com retangulo)
    c.setFillColorRGB(0.1, 0.1, 0.15) # Azul muito escuro
    c.rect(0, 0, w, h, fill=1)
    
    # Elementos Geométricos (Matrix style)
    c.setStrokeColor(colors.lawngreen)
    c.setLineWidth(2)
    c.line(2*cm, h-2*cm, 5*cm, h-2*cm) # Top Left
    c.line(2*cm, h-2*cm, 2*cm, h-5*cm)
    
    c.line(w-2*cm, 2*cm, w-5*cm, 2*cm) # Bottom Right
    c.line(w-2*cm, 2*cm, w-2*cm, 5*cm)

    # Textos
    c.setFillColor(colors.white)
    c.setFont("Courier-Bold", 40)
    c.drawCentredString(w/2, h - 5*cm, "< CERTIFICADO_DE_PARTICIPACAO />")
    
    c.setFont("Courier", 20)
    c.drawCentredString(w/2, h - 8*cm, "user.certified = True")
    
    c.setFillColor(colors.lawngreen) # Verde Neon
    c.setFont("Courier-Bold", 32)
    c.drawCentredString(w/2, h - 10*cm, data.participante_nome.upper())
    
    c.setFillColor(colors.white)
    c.setFont("Courier", 16)
    c.drawCentredString(w/2, h - 13*cm, f"Event: {data.evento_nome}")
    c.drawCentredString(w/2, h - 14*cm, f"Date: {data.evento_data}")
    
    _draw_validation_footer(c, w, 2*cm, data.codigo_unico, colors.lightgrey, font="Courier")

def _draw_health_style(c, w, h, data):
    """Estilo Saúde (Clean/Minimalista)"""
    # Cor Suave (Ciano/Branco)
    c.setStrokeColor(colors.lightseagreen)
    c.setLineWidth(10)
    c.circle(w/2, h/2, h/1.5, stroke=1, fill=0) # Circulo central decorativo
    
    # Cruz simbólica sutil no topo
    c.setFillColor(colors.lightseagreen)
    c.rect(w/2 - 15, h - 3*cm, 30, 10, fill=1, stroke=0)
    c.rect(w/2 - 10, h - 3*cm - 10, 10, 30, fill=1, stroke=0)

    c.setFillColor(colors.darkslategray)
    c.setFont("Helvetica", 32)
    c.drawCentredString(w/2, h - 5.5*cm, "Certificado de Atualização")
    
    c.setFont("Helvetica-Oblique", 18)
    c.drawCentredString(w/2, h - 8*cm, "Conferido a")
    
    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.lightseagreen)
    c.drawCentredString(w/2, h - 10*cm, data.participante_nome)
    
    c.setFillColor(colors.darkslategray)
    c.setFont("Helvetica", 16)
    c.drawCentredString(w/2, h - 12.5*cm, f"Pela participação no evento de saúde e bem-estar:")
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(w/2, h - 13.5*cm, data.evento_nome)
    
    _draw_validation_footer(c, w, 1.5*cm, data.codigo_unico, colors.gray)

def _draw_education_style(c, w, h, data):
    """Estilo Educação (Acadêmico/Pergaminho)"""
    # Fundo Bege Claro
    c.setFillColorRGB(0.98, 0.96, 0.90)
    c.rect(0, 0, w, h, fill=1)
    
    # Borda Dupla
    c.setStrokeColor(colors.maroon)
    c.setLineWidth(3)
    c.rect(1.5*cm, 1.5*cm, w-3*cm, h-3*cm)
    c.setLineWidth(1)
    c.rect(1.8*cm, 1.8*cm, w-3.6*cm, h-3.6*cm)

    c.setFillColor(colors.black)
    c.setFont("Times-Roman", 42)
    c.drawCentredString(w/2, h - 6*cm, "Certificado de Conclusão")
    
    c.setFont("Times-Roman", 20)
    c.drawCentredString(w/2, h - 9*cm, "A instituição certifica que")
    
    c.setFont("Times-BoldItalic", 34)
    c.drawCentredString(w/2, h - 11*cm, data.participante_nome)
    
    c.setFont("Times-Roman", 18)
    c.drawCentredString(w/2, h - 13.5*cm, f"concluiu as atividades do evento {data.evento_nome}")
    c.drawCentredString(w/2, h - 14.5*cm, f"em {data.evento_data}")

    _draw_validation_footer(c, w, 2.5*cm, data.codigo_unico, colors.maroon, font="Times-Roman")

def _draw_validation_footer(c, w, y, codigo, color, font="Helvetica"):
    """Desenha texto de validação e o QR Code."""
    
    # 1. URL de Validação Direta
    # Aponta para o front-end passando o código como query param
    url_validacao = f"http://localhost:3000/validar?codigo={codigo}"
    
    # 2. Gerar QR Code em Memória
    qr_img = qrcode.make(url_validacao)
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    
    # 3. Desenhar QR Code no PDF (Canto Inferior Direito)
    qr_size = 2.5 * cm
    # x = largura - margem - tamanho, y = altura_do_rodape
    qr_x = w - 4 * cm 
    qr_y = y - 0.5 * cm
    
    c.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)
    
    # 4. Desenhar Textos
    c.setFont(font, 9)
    c.setFillColor(color)
    
    # Centraliza o texto, mas desloca um pouco para a esquerda para não bater no QR
    text_center = w / 2 
    
    c.drawCentredString(text_center, y + 10, f"Código de Autenticidade: {codigo}")
    c.drawCentredString(text_center, y, "Para validar, escaneie o QR Code ao lado")
    c.drawCentredString(text_center, y - 10, "ou acesse: http://localhost:3000/validar")