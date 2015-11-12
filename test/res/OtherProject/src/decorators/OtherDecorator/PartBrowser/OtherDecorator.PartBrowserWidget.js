/*globals define, _, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

'use strict';

define(['js/Constants', 'js/NodePropertyNames', 'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase', 'js/Widgets/DiagramDesigner/DiagramDesignerWidget.Constants', 'text!../DiagramDesigner/OtherDecorator.DiagramDesignerWidget.html', 'css!../DiagramDesigner/OtherDecorator.DiagramDesignerWidget.css', 'css!./OtherDecorator.PartBrowserWidget.css'], function (CONSTANTS, nodePropertyNames, PartBrowserWidgetDecoratorBase, DiagramDesignerWidgetConstants, OtherDecoratorDiagramDesignerWidgetTemplate) {

    'use strict';

    var OtherDecoratorPartBrowserWidget,
        __parent__ = PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = 'OtherDecoratorPartBrowserWidget';

    OtherDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend({}, options);

        __parent__.apply(this, [opts]);

        this.logger.debug('OtherDecoratorPartBrowserWidget ctor');
    };

    _.extend(OtherDecoratorPartBrowserWidget.prototype, __parent__.prototype);
    OtherDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;

    /*********************** OVERRIDE DiagramDesignerWidgetDecoratorBase MEMBERS **************************/

    OtherDecoratorPartBrowserWidget.prototype.$DOMBase = (function () {
        var el = $(OtherDecoratorDiagramDesignerWidgetTemplate);
        //use the same HTML template as the OtherDecorator.DiagramDesignerWidget
        //but remove the connector DOM elements since they are not needed in the PartBrowser
        el.find('.' + DiagramDesignerWidgetConstants.CONNECTOR_CLASS).remove();
        return el;
    })();

    OtherDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        //find name placeholder
        this.skinParts.$name = this.$el.find('.name');

        this._renderContent();
    };

    OtherDecoratorPartBrowserWidget.prototype.afterAppend = function () {};

    OtherDecoratorPartBrowserWidget.prototype._renderContent = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]);

        //render GME-ID in the DOM, for debugging
        if (DEBUG) {
            this.$el.attr({ 'data-id': this._metaInfo[CONSTANTS.GME_ID] });
        }

        if (nodeObj) {
            this.skinParts.$name.text(nodeObj.getAttribute(nodePropertyNames.Attributes.name) || '');
        }
    };

    OtherDecoratorPartBrowserWidget.prototype.update = function () {
        this._renderContent();
    };

    return OtherDecoratorPartBrowserWidget;
});