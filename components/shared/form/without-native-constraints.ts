/** Keep required indicators in the UI; schema validation owns the constraints. */
export function withoutNativeConstraints<Props extends object>(
  props: Props
): Props {
  const result = { ...props }
  for (const attribute of [
    "required",
    "min",
    "max",
    "minLength",
    "maxLength",
    "pattern",
    "step",
  ])
    Reflect.deleteProperty(result, attribute)
  return result
}
