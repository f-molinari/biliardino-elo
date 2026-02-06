/**
 * Get the class name for a given class number.
 *
 * @param classNumber - The class number (0-4).
 * @returns The class name.
 */
export function getClassName(classNumber: number): string {
  const classNames: Record<number, string> = {
    0: 'Squalo',
    1: 'Barracuda',
    2: 'Tonno',
    3: 'Spigola',
    4: 'Sogliola'
  };
  return classNames[classNumber] || 'Sconosciuto';
}
