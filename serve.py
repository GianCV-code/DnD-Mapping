import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching headers and CORS for local testing
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    port = PORT
    server = None
    for attempt in range(5):
        try:
            server = socketserver.TCPServer(("", port), Handler)
            break
        except OSError:
            print(f"Puerto {port} en uso, probando puerto {port + 1}...")
            port += 1

    if not server:
        print("No se pudo iniciar el servidor en ningún puerto.")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 60)
    print(f" Servidor Local Iniciado para el Mapa de Chult")
    print(f" URL: {url}")
    print(" Presiona Ctrl+C en esta consola para detener el servidor")
    print("=" * 60)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.server_close()

if __name__ == "__main__":
    main()
