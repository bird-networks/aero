// TODO: Document the props with JSDoc
export default interface RewriterConfig {
  /** Flag indicating if this is a module script */
  isModule?: boolean;
  globalsConfig: {
    aeroGel?: {
      propTrees?: {
        fakeLet: string;
        fakeConst: string;
      };
      proxified?: {
        evalFunc: string;
        location: string;
      };
    };
    /** Direct propTrees at top level for simpler config structure */
    propTrees?: {
      fakeLet: string;
      fakeConst: string;
    };
    proxified?: {
      evalFunc: string;
      location: string;
    };
    checkFunc?: string;
    generic?: {
      escapedPropTrees?: string[];
      checkFunc: string;
    };
  };
  keywordGenConfig: {
    supportStrings: boolean;
    supportTemplateLiterals: boolean;
    supportRegex: boolean;
  };
  trackers: {
    blockDepth: boolean;
    propertyChain: boolean;
    proxyApply: boolean;
  };
}
