/** `DataTransfer.types` is often a DOMStringList (no `.includes`). */
export function dataTransferHasType(dt: DataTransfer, mime: string): boolean {
	const types = dt.types;
	if (!types || types.length === 0) return false;
	for (let i = 0; i < types.length; i++) {
		if (types[i] === mime) return true;
	}
	return false;
}
