#!/usr/bin/env ts-node
/**
 * Manual test script for batch conversation retrieval tools
 */

import { getConversationHistoriesLogic } from './src/mcp-server/tools/getConversationHistories/logic.js';
import { awaitConversationHistoriesLogic } from './src/mcp-server/tools/awaitConversationHistories/logic.js';
import { requestContextService } from './src/utils/index.js';

async function main() {
  console.log('🧪 Testing Batch Conversation Retrieval\n');

  const testIds = [
    '20251031-1761933314500',
    '20251031-1761933315512',
    '20251031-1761933316496',
    'invalid-id-999',  // Should return error
  ];

  const context = requestContextService.createRequestContext({
    operation: 'manual-test-batch-retrieval',
  });

  // Test 1: get_conversation_histories (immediate)
  console.log('📋 Test 1: get_conversation_histories (immediate retrieval)');
  console.log('=' .repeat(60));
  
  try {
    const immediateResults = await getConversationHistoriesLogic(
      { conversationIds: testIds, includeSystemPrompt: false },
      context
    );

    console.log(`\n✅ Retrieved ${Object.keys(immediateResults).length} conversations:\n`);

    for (const [id, result] of Object.entries(immediateResults)) {
      console.log(`Conversation: ${id}`);
      
      if (result.error) {
        console.log(`  ❌ Error: [${result.error.code}] ${result.error.message}`);
      } else {
        console.log(`  Status: ${result.status?.status || 'no-status'}`);
        if (result.progress) {
          console.log(`  Progress: ${result.progress.percentage}% - ${result.progress.message}`);
        }
        console.log(`  Messages: ${result.conversation?.messageCount || 0}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: await_conversation_histories (wait for completion)
  console.log('\n⏳ Test 2: await_conversation_histories (wait for completion)');
  console.log('=' .repeat(60));
  console.log('This will poll until all jobs complete...\n');

  // Use only valid IDs for await test
  const validIds = testIds.filter(id => !id.includes('invalid'));

  try {
    const startTime = Date.now();
    const awaitResults = await awaitConversationHistoriesLogic(
      { 
        conversationIds: validIds, 
        includeSystemPrompt: false,
        pollingIntervalMs: 2000 
      },
      context
    );

    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ All jobs completed after ${elapsedSeconds} seconds\n`);

    for (const [id, result] of Object.entries(awaitResults)) {
      console.log(`Conversation: ${id}`);
      
      if (result.error) {
        console.log(`  ❌ Error: [${result.error.code}] ${result.error.message}`);
      } else {
        console.log(`  Status: ${result.status?.status || 'no-status'}`);
        console.log(`  Messages: ${result.conversation?.messageCount || 0}`);
        
        // Show first message preview
        if (result.conversation?.messages && result.conversation.messages.length > 0) {
          const firstMsg = result.conversation.messages[0];
          const preview = firstMsg.content.substring(0, 80);
          console.log(`  First message: "${preview}..."`);
        }
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  console.log('🎉 Manual testing complete!\n');
}

main().catch(console.error);




