#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文本处理脚本
功能：将txt文件内容处理成一行一行的，无空行
规则：
1. 一般按句号换行
2. 如果一句内超过了30个字符，就按这一句内的逗号换行
"""

import os
import sys

def process_text(input_file, output_file):
    """处理文本文件"""
    try:
        # 读取文件内容
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 移除多余的空白字符
        content = ' '.join(content.split())
        
        # 按句号分割句子
        sentences = content.split('。')
        processed_lines = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # 检查句子长度
            if len(sentence) <= 30:
                # 句子长度不超过30，直接添加
                processed_lines.append(sentence + '。')
            else:
                # 句子长度超过30，按逗号分割
                parts = sentence.split('，')
                current_line = ''
                
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    
                    # 检查添加当前部分后是否超过30字符
                    if len(current_line) + len(part) + (1 if current_line else 0) <= 30:
                        if current_line:
                            current_line += '，' + part
                        else:
                            current_line = part
                    else:
                        # 超过30字符，保存当前行并开始新行
                        if current_line:
                            processed_lines.append(current_line + '，')
                        current_line = part
                
                # 保存最后一行
                if current_line:
                    processed_lines.append(current_line + '。')
        
        # 写入处理后的内容
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(processed_lines))
        
        print(f"处理完成！")
        print(f"输入文件: {input_file}")
        print(f"输出文件: {output_file}")
        print(f"处理后行数: {len(processed_lines)}")
        
    except Exception as e:
        print(f"处理过程中出错: {str(e)}")
        return False
    
    return True

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法：python text_processor.py <输入文件路径> [输出文件路径]")
        print("示例1：python text_processor.py input.txt")
        print("示例2：python text_processor.py input.txt output.txt")
        print("默认路径：public/Jing 目录")
        return
    
    input_file = sys.argv[1]
    
    # 默认路径设置
    default_path = os.path.join('..', 'public', 'Jing')
    
    # 处理输入文件路径
    if not os.path.isabs(input_file):
        # 如果输入文件不是绝对路径，检查是否在默认路径中
        if not os.path.exists(input_file):
            input_file = os.path.join(default_path, input_file)
    
    # 处理输出文件路径
    if len(sys.argv) == 3:
        # 如果提供了输出文件路径
        output_file = sys.argv[2]
        if not os.path.isabs(output_file):
            # 如果输出文件不是绝对路径，默认保存到默认路径
            output_file = os.path.join(default_path, output_file)
    else:
        # 如果没有提供输出文件路径，使用输入文件名，在前面添加"processed_"前缀
        input_filename = os.path.basename(input_file)
        output_filename = f"{input_filename}"
        output_file = os.path.join(default_path, output_filename)
    
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误：输入文件 '{input_file}' 不存在")
        return
    
    # 检查输入文件是否为txt文件
    if not input_file.lower().endswith('.txt'):
        print("错误：输入文件必须是txt文件")
        return
    
    # 确保输出目录存在
    output_dir = os.path.dirname(output_file)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    # 处理文本
    process_text(input_file, output_file)

if __name__ == "__main__":
    main()
