/// <reference types="jest" />

// Augment global test environment with jest-dom matchers
import "@testing-library/jest-dom";

// Stub type declarations so TS compiler won't error even if @types/* not yet installed.
// Once proper @types packages are added the stubs are shadowed automatically.
declare module "@testing-library/react";
declare module "@testing-library/user-event";