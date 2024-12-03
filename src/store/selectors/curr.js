export default function() {
  const { entries, index } = this.stack
  return entries[index]
}