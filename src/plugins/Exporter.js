import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { Plugin } from '../core/Plugin.js';

// Files for the architect: the whole house as GLB (with colours and textures, opens in SketchUp/Blender/Revit
// via import) or OBJ (geometry only, opens almost anywhere). Units are centimetres.
export class Exporter extends Plugin {
  static id = 'export';

  install() {
    const f = this.app.panel?.folder('ייצוא לאדריכל');
    if (!f) return;
    f.add({ 'מודל תלת-ממד GLB': () => this.glb() }, 'מודל תלת-ממד GLB');
    f.add({ 'מודל תלת-ממד OBJ': () => this.obj() }, 'מודל תלת-ממד OBJ');
    const plan = this.app.plugin('plan');
    if (plan) f.add({ 'תוכנית קומה להדפסה / PDF': () => plan.print() }, 'תוכנית קומה להדפסה / PDF');
    f.close();
  }

  async glb() {
    const data = await new GLTFExporter().parseAsync(this.app.world, { binary: true, onlyVisible: true });
    download(new Blob([data], { type: 'model/gltf-binary' }), 'בית.glb');
  }

  obj() {
    download(new Blob([new OBJExporter().parse(this.app.world)], { type: 'text/plain' }), 'בית.obj');
  }
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
