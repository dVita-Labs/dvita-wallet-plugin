interface Array<T> {
    /**
     * Determines whether an array includes a certain element, returning true or false as appropriate.
     * @param searchElement The element to search for.
     * @param fromIndex The position in this array at which to begin searching for searchElement.
     * @see https://github.com/microsoft/TypeScript/issues/26255#issuecomment-681313150
     */
    includes(searchElement: unknown, fromIndex?: number): searchElement is T;
}
