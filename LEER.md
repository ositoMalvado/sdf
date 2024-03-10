# Instalar Stable Diffusion Web UI
<!-- Primer paso -->
> Ejecutar comandos de instalación en una **Terminal**
```
cd /home/studio-lab-user
KERNEL_NAME="Forge_UI"
PYTHON="3.10.6"
conda create --yes --name "$KERNEL_NAME" python="$PYTHON"
conda activate "$KERNEL_NAME"
pip install --quiet ipykernel

```
<!-- Esperar que se pueda crear un notebook con el entorno Forge_UI -->
## Ejecutar Stable Diffusion Web UI
> - Abrir notebook **the_best.ipynb** y elegir Kernel **Forge_UI**
>
> - Ejecutar las celdas del notebook
> - - Celda 1: Instala Stable Difussion Forge UI
> - - Celda 2: Descarga los modelos deseados
> - - Celda 3: Ejecuta Stable Diffusion Web UI