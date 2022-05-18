import * as dapi from "./";
import { libraryName } from "../common/compat";

/**
 * Expose official global object for dVITA
 */
window[libraryName] = dapi;
