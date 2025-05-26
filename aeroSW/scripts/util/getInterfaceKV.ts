// For type safety
/// Neverthrow
import type { Result, ResultAsync } from "neverthrow";
import {
  err as nErr,
  errAsync as nErrAsync,
  ok as nOk,
  okAsync as nOkAsync,
} from "neverthrow";
import { fmtNeverthrowErr } from "../../tests/util/fmtErrTest.ts";

// Utility
import type { Node, SourceFile } from "typescript";
import {
  createSourceFile,
  forEachChild,
  isIdentifier,
  isInterfaceDeclaration,
  isPropertySignature,
  ScriptTarget,
} from "typescript";
import { readFile } from "fs/promises";

/**
 * Gets the keys of an interface and values (actual type) from a path to a TS file
 * Reads a file and gets the keys of a given interface
 * @param filePath The location of the TS file
 * @param interfaceName The name of the interface to get the keys from
 */
export default async function getInterfaceKeys(
  filePath: string,
  interfaceName: string,
): Promise<ResultAsync<{ [key: string]: string }, Error>> {
  let data: string;
  try {
    data = await readFile(filePath, "utf-8");
  } catch (err) {
    return fmtNeverthrowErr(
      `Failed to read the file at the path you provided (${filePath})`,
      err,
    );
  }
  let sourceFile: SourceFile;
  try {
    sourceFile = createSourceFile(filePath, data, ScriptTarget.Latest, true);
  } catch (err) {
    return fmtNeverthrowErr(
      `Failed to create the source file from the file you wanted (${filePath}). Perhaps the TS is invalid?`,
      err,
    );
  }

  const getInterfaceKeysRes = getInterfaceKeysFromSourceFile(
    sourceFile,
    interfaceName,
  );
  if (getInterfaceKeysRes.isErr()) {
    // Add on the file path to the error message for more context
    return nErrAsync(
      new Error(
        `Failed to find the interface ${interfaceName} from the file ${filePath}`,
      ),
    );
  }
  return nOkAsync(getInterfaceKeysRes.value);
}

/**
 * Gets the keys of an interface and values (actual type) from a source file
 * This is a helper function meant to be for internal-use only, but it is exposed just in case you want to use it for whatever reason.
 * @param sourceFile The source file to search in
 * @param interfaceName The interface name to search for in the sourceFile
 * @returns The keys of the interface
 */
export function getInterfaceKeysFromSourceFile(
  sourceFile: SourceFile,
  interfaceName: string,
): Result<{ [key: string]: string }, Error> {
  let foundInterface = false;
  let kvs: { [key: string]: string } = {};
  const extractKeysAndTypesFromInterface = (node: Node) => {
    if (isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      foundInterface = true;
      node.members.forEach((member) => {
        if (
          isPropertySignature(member) && member.name &&
          isIdentifier(member.name) && member.type && isIdentifier(member.type)
        ) {
          kvs[member.name.text] = member.type.text;
        }
      });
    }
    forEachChild(node, extractKeysAndTypesFromInterface);
  };
  extractKeysAndTypesFromInterface(sourceFile);
  if (!foundInterface) {
    return nErr(
      new Error(
        `Failed to find the interface ${interfaceName} in the source file`,
      ),
    );
  }
  return nOk(kvs);
}
