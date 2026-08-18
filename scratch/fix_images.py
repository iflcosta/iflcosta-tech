import os

file_path = "index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix Hero Image Green Box
hero_old = '''<div class="relative hidden lg:block">
                        <!-- Imagem Placeholder -->
                        <div class="aspect-square bg-zinc-900 border-2 border-zinc-800 p-8 relative grayscale hover:grayscale-0 transition-all duration-500">
                            <img src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=800&q=80" alt="Hardware Setup" class="absolute inset-0 w-full h-full object-cover">
                            <div class="absolute inset-0 border-4 border-zinc-800 m-4 pointer-events-none"></div>
                            <div class="absolute -bottom-6 -left-6 w-48 h-48 bg-brand mix-blend-difference pointer-events-none"></div>
                        </div>
                    </div>'''

hero_new = '''<div class="relative hidden lg:block group">
                        <!-- Bloco Offset -->
                        <div class="absolute -bottom-4 -left-4 w-full h-full bg-brand border-2 border-zinc-800 transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2"></div>
                        <!-- Imagem -->
                        <div class="aspect-square bg-zinc-900 border-2 border-zinc-800 relative grayscale group-hover:grayscale-0 transition-all duration-500 z-10 overflow-hidden">
                            <img src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=800&q=80" alt="Hardware Setup" class="absolute inset-0 w-full h-full object-cover">
                            <div class="absolute inset-0 border-4 border-zinc-800/50 m-4 pointer-events-none z-20"></div>
                        </div>
                    </div>'''

if hero_old in content:
    content = content.replace(hero_old, hero_new)

# 2. Fix Prova Real Image Zoom
prova_old = '''<div class="bg-zinc-800 border-2 border-zinc-700 flex flex-col items-center justify-center text-zinc-500 font-mono text-center p-8 aspect-square relative group">'''
prova_new = '''<div class="bg-zinc-800 border-2 border-zinc-700 flex flex-col items-center justify-center text-zinc-500 font-mono text-center p-8 aspect-video relative group overflow-hidden">'''

if prova_old in content:
    content = content.replace(prova_old, prova_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Images layout fixed.")
