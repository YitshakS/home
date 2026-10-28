// Maps the "type" string used in data/items.json to an Item class.
// Adding a new kind of object = one class file + registry.add(ThatClass).
const classes = new Map();

export const registry = {
  add(cls) {
    if (!cls.type) throw new Error(`${cls.name} has no static type`);
    classes.set(cls.type, cls);
  },
  get(type) {
    return classes.get(type);
  },
  types() {
    return [...classes.keys()];
  },
};
