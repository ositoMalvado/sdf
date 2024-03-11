# Clonar repositorio
> En la terminal escribir:
```
git clone https://github.com/ositoMalvado/sagemaker_sd
```
Si ya tienes algo instalado en tu Jupyter recomiendo utilizar la última celda del notebook antes de continuar:
![Ejecutar última celda de notebook antes que nada](https://i.imgur.com/1CqGfhY.png)

Si haces esto, entonces reinicia SageMaker. Tendrás que clonar el repositorio a partir de ahora.
# Instalar Stable Diffusion Web UI
<!-- Primer paso -->
> Ejecutar comandos de instalación en una **Terminal**.
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
![alt text](https://i.imgur.com/4RStREs.png)
>
> - Ejecutar las celdas del notebook
> - - Celda 1: Instala Stable Difussion Forge UI
> - - Celda 2: Descarga los modelos deseados
> - - Celda 3: Ejecuta Stable Diffusion Web UI