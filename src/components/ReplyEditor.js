import React from 'react';
import EditorComponent from './EditorComponent';

const ReplyEditor = React.forwardRef(({
  initialContent = '',
  onSave,
  placeholder = 'Write a reply...',
}, ref) => (
  <EditorComponent
    ref={ref}
    initialContent={initialContent}
    onSave={onSave}
    placeholder={placeholder}
  />
));

ReplyEditor.displayName = 'ReplyEditor';

export default ReplyEditor;
