from pypdf import PdfReader
import sys

path = 'LR3.pdf'
reader = PdfReader(path)
texts = []
for i, page in enumerate(reader.pages, start=1):
    t = page.extract_text()
    if t:
        texts.append(f'--- PAGE {i} ---\n' + t)

out = '\n\n'.join(texts)
print(out)
