// @flow

import cx from 'classnames';
import {EditorState} from 'prosemirror-state';
import {Transaction} from 'prosemirror-state';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import React from 'react';
import webfontloader from 'webfontloader';

import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-view/style/prosemirror.css';

import {BOOKMARK, IMAGE, MATH} from '../NodeNames';
import WebFontLoader from '../WebFontLoader';
import createEmptyEditorState from '../createEmptyEditorState';
import normalizeHTML from '../normalizeHTML';
import BookmarkNodeView from './BookmarkNodeView';
import CustomEditorView from './CustomEditorView';
import CustomNodeView from './CustomNodeView';
import ImageNodeView from './ImageNodeView';
import MathNodeView from './MathNodeView';
import uuid from './uuid';

import './czi-editor.css';

import type {EditorRuntime} from '../Types';

// Monkey patch the `scrollIntoView` mathod of 'Transaction'.
// Why this is necessary?
// It appears that promse-mirror does call `scrollIntoView` extensively
// from many of the built-in transformations, thus cause unwanted page
// scrolls. To make the behavior more manageable, this patched method asks
// developer to explicitly use `scrollIntoView(true)` to enforce page scroll.
const scrollIntoView = Transaction.prototype.scrollIntoView;
const scrollIntoViewPatched = function(forced: boolean): Transaction {
  if (forced === true && scrollIntoView) {
    return scrollIntoView.call(this);
  } else {
    return this;
  }
};
Transaction.prototype.scrollIntoView = scrollIntoViewPatched;

const EDITOR_EMPTY_STATE = createEmptyEditorState();

WebFontLoader.setImplementation(webfontloader);

function transformPastedHTML(html: string): string {
  return normalizeHTML(html);
}

function bindNodeView(NodeView: CustomNodeView): Function {
  return (node, view, getPos, decorations) => {
    return new NodeView(
      node,
      view,
      getPos,
      decorations,
    );
  };
}

class Editor extends React.PureComponent<any, any, any> {

  _id = uuid();

  _editorView = null;

  props: {
    disabled?: ?boolean,
    editorState?: ?EditorState,
    embedded?: ?boolean,
    onChange?: ?(state: EditorState) => void,
    onReady?: ?(view: EditorView) => void,
    placeholder?: ?(string | React.Element<any>),
    readOnly?: ?boolean,
    runtime?: ?EditorRuntime,
  };

  componentDidMount(): void {
    const {
      onReady, editorState, readOnly,
      runtime, placeholder, disabled,
    } = this.props;

    const editorNode = document.getElementById(this._id);
    if (editorNode) {
      // Reference: http://prosemirror.net/examples/basic/
      const view = this._editorView = new CustomEditorView(editorNode, {
        state: editorState || EDITOR_EMPTY_STATE,
        dispatchTransaction: this._dispatchTransaction,
        editable: this._isEditable,
        transformPastedHTML,
        nodeViews: {
          [IMAGE]: bindNodeView(ImageNodeView),
          [MATH]: bindNodeView(MathNodeView),
          [BOOKMARK]: bindNodeView(BookmarkNodeView),
        },
      });

      view.runtime = runtime;
      view.placeholder = placeholder;
      view.readOnly = !!readOnly;
      view.disabled = !!disabled;
      view.updateState(editorState || EDITOR_EMPTY_STATE);

      onReady && onReady(this._editorView);
    }
  }

  componentDidUpdate(): void {
    const view = this._editorView;
    if (view)  {
      const {
        runtime, editorState, placeholder, readOnly, disabled,
      } = this.props;
      const state = editorState || EDITOR_EMPTY_STATE;
      view.runtime = runtime;
      view.placeholder = placeholder;
      view.readOnly = !!readOnly;
      view.disabled = !!disabled;
      view.updateState(state);
    }
  }

  componentWillUnmount(): void {
    this._editorView && this._editorView.destroy();
    this._editorView = null;
  }

  render(): React.Element<any> {
    const {embedded, readOnly} = this.props;
    const className = cx('prosemirror-editor-wrapper', {embedded, readOnly});
    return (
      <div
        className={className}
        id={this._id}
      />
    );
  }

  focus(): void {
    this._editorView && this._editorView.focus();
  }

  _dispatchTransaction = (transaction: Transform): void => {
    const {onChange, editorState, readOnly} = this.props;
    if (readOnly === true) {
      return;
    }
    const nextState = (editorState || EDITOR_EMPTY_STATE).apply(transaction);
    onChange && onChange(nextState);
  };

  _isEditable = (): boolean => {
    const {disabled, readOnly} = this.props;
    return !!this._editorView && !readOnly && !disabled;
  };
}

export default Editor;
