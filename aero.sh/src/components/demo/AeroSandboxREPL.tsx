import Playground from "javascript-playgrounds"

export default function AeroSandboxREPL(props: any) {
  /** REPL demo using javascript-playgrounds */
  return (
    <>
      <select className="select select-bordered w-full max-w-xs">
        <option disabled selected>The examples are not finished</option>
      </select>
      {/*TODO: Link in the AeroSandbox demo (with Revision support just like on index)*/}
      <Playground {...props} />
    </>
  )
}