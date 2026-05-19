declare module "*.css";

interface ScrollbarConstructor {
  new (element: HTMLElement, options?: any): any;
}
declare var Scrollbar: ScrollbarConstructor;
