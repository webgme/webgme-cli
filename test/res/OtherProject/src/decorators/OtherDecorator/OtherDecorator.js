/*globals define, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
  "js/Decorators/DecoratorBase",
  "./DiagramDesigner/OtherDecorator.DiagramDesignerWidget",
  "./PartBrowser/OtherDecorator.PartBrowserWidget",
], function (
  DecoratorBase,
  OtherDecoratorDiagramDesignerWidget,
  OtherDecoratorPartBrowserWidget
) {
  "use strict";

  var OtherDecorator,
    __parent__ = DecoratorBase,
    __parent_proto__ = DecoratorBase.prototype,
    DECORATOR_ID = "OtherDecorator";

  OtherDecorator = function (params) {
    var opts = _.extend({ loggerName: this.DECORATORID }, params);

    __parent__.apply(this, [opts]);

    this.logger.debug("OtherDecorator ctor");
  };

  _.extend(OtherDecorator.prototype, __parent_proto__);
  OtherDecorator.prototype.DECORATORID = DECORATOR_ID;

  /*********************** OVERRIDE DecoratorBase MEMBERS **************************/

  OtherDecorator.prototype.initializeSupportedWidgetMap = function () {
    this.supportedWidgetMap = {
      DiagramDesigner: OtherDecoratorDiagramDesignerWidget,
      PartBrowser: OtherDecoratorPartBrowserWidget,
    };
  };

  return OtherDecorator;
});
