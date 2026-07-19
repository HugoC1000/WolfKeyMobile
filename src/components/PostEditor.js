import React from 'react';
import EditorComponent from './EditorComponent';

const PostEditor = React.forwardRef(({
  initialContent = '',
  onSave,
  placeholder = 'Add details...',
}, ref) => (
  <EditorComponent
    ref={ref}
    initialContent={initialContent}
    onSave={onSave}
    placeholder={placeholder}
    composer
    autoGrow
  />
));

PostEditor.displayName = 'PostEditor';

export default PostEditor;
