from google import genai
import config

client = genai.Client(api_key=config.GEMINI_API_KEY)

print("Buscando modelos...")
for model in client.models.list():
    # Filtra para mostrar apenas os modelos de texto/flash
    if "flash" in model.name.lower() or "gemini" in model.name.lower():
        print(f"Nome exato na API: {model.name}")

print("Buscando modelos de IMAGEM...")
for model in client.models.list():
    # Agora filtra apenas modelos que tenham 'image' ou 'imagen' no nome
    if "image" in model.name.lower():
        print(f"Nome exato na API: {model.name}")