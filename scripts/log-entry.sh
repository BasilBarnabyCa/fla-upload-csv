#!/bin/bash

# Enhanced dev journal entry script
# Usage: ./scripts/log-entry.sh "Entry title" "Brief description" [type]
# Types: major, feature, fix, refactor, docs (default: feature)

JOURNAL_FILE="DEV_JOURNAL.md"
DATE=$(date +"%Y-%m-%d")
TITLE=${1:-"Daily Update"}
DESCRIPTION=${2:-"General progress and updates"}
TYPE=${3:-"feature"}

# Type-specific emojis and formatting
case $TYPE in
    "major") EMOJI="🎉"; PREFIX="MAJOR" ;;
    "refactor") EMOJI="🏗️"; PREFIX="ARCHITECTURE" ;;
    "fix") EMOJI="🔧"; PREFIX="CRITICAL FIXES" ;;
    "feature") EMOJI="✨"; PREFIX="FEATURE" ;;
    "docs") EMOJI="📚"; PREFIX="DOCUMENTATION" ;;
    *) EMOJI="📝"; PREFIX="UPDATE" ;;
esac

# Create the enhanced entry template
ENTRY="## $DATE - $TITLE

### $EMOJI **$PREFIX**

#### 🎯 **Overview**
$DESCRIPTION

#### 🚨 **Critical Issues & Errors**
- 

#### ✅ **What Was Accomplished**
- 

#### 🔧 **Technical Implementation**
- 

#### 📋 **Files Modified**
- 

#### 🚀 **Current Status**
- 

#### 🎯 **Next Steps**
- [ ] 

#### 💡 **Key Decisions & Lessons**
- 

#### 🔗 **Related Resources**
- 

---
"

# Insert the entry at the top
if [ -f "$JOURNAL_FILE" ]; then
    # Create temporary file with new entry
    echo -e "# Dev Journal - FLA Timecard System\n\n$ENTRY" > temp_entry.md
    # Append existing content (skip first line which is the title)
    tail -n +2 "$JOURNAL_FILE" >> temp_entry.md
    # Replace original file
    mv temp_entry.md "$JOURNAL_FILE"
else
    echo "JOURNAL_FILE not found. Creating new journal..."
    echo -e "# Dev Journal - FLA Timecard System\n\n$ENTRY" > "$JOURNAL_FILE"
fi

echo "✅ Added $TYPE entry: $DATE - $TITLE"
echo "📝 Edit $JOURNAL_FILE to add technical details"
echo "🎯 Use types: major, refactor, fix, feature, docs"