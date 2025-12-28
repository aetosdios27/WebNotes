import { expect, it, describe, beforeEach } from 'bun:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Subnote } from './Subnote'; 
import { GlobalWindow } from 'happy-dom';

// --- Manual DOM Setup ---
const window = new GlobalWindow() as any;
global.window = window;
global.document = window.document;
global.Node = window.Node;
global.HTMLElement = window.HTMLElement;
global.navigator = window.navigator;
global.KeyboardEvent = window.KeyboardEvent; 

describe('Subnote Extension Logic', () => {
  let editor: Editor;

  beforeEach(() => {
    const element = document.createElement('div');
    editor = new Editor({
      element,
      extensions: [StarterKit, Subnote],
    });
  });

  it('should transform {google}(big org) into just "google"', async () => {
    // 1. Insert the text pattern without the final bracket
    editor.commands.insertContent('{google}(big org');
    
    // 2. Insert the final character ')' followed by ' ' manually 
    // This mimics the exact state change that triggers InputRules
    editor.view.dispatch(editor.view.state.tr.insertText(') '));
    
    // 3. Wait for the engine to reconcile
    await new Promise(resolve => setTimeout(resolve, 100));

    const text = editor.getText();
    
    // Assert: If the rule fired, text should be 'google '
    expect(text.trim()).toBe('google');
    expect(text).not.toContain('big org');
    
    const attrs = editor.getAttributes('subnote');
    expect(attrs.meaning).toBe('big org');
  });

  it('should revert to raw text on Backspace (Burst Logic)', async () => {
    editor.commands.insertContent('{logic}(test');
    editor.view.dispatch(editor.view.state.tr.insertText(') '));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    editor.commands.setTextSelection(4); 
    editor.commands.keyboardShortcut('Backspace'); 
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.getText().trim()).toBe('{logic}(test)');
  });

  it('should not carry the underline to a new line on Enter', async () => {
    editor.commands.insertContent('{split}(this');
    editor.view.dispatch(editor.view.state.tr.insertText(') '));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    editor.commands.setTextSelection(3); 
    editor.commands.keyboardShortcut('Enter'); 
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(editor.isActive('subnote')).toBe(false);
  });
});